## python libraries
import os
import json
import boto3 # not a python library but is included in lambda without need to install it
import logging
import traceback
import sys
from datetime import datetime, timezone

## installed packages
from pydantic import AfterValidator, ValidationError # layer: pydantic
from boto3.dynamodb.conditions import Key
from ksuid import KsuidMs # layer: utils
import stripe

## custom scripts
sys.path.append(os.path.dirname(__file__))
from _shared.parser import parse_event
from _shared.DecimalEncoder import DecimalEncoder
from _shared.helpers import make_response
from _shared.stripe_catalog import create_stripe_catalog, rollback_stripe_created
from _pydantic.models.bundles_models import BundleObject, BundleResponse, CreateBundleRequest, BundleListResponse, BundleResponsePublic, BundleListResponsePublic, UpdateBundleRequest, PublishBundlesRequest, Status
from _pydantic.models.models_extended import BundleModel
#from _pydantic.EventBridge import triggerEBEvent, trigger_eventbridge_event, EventType, Action # pydantic layer
from _pydantic.dynamodb import DynamoModel # pydantic layer
from _pydantic.dynamodb import batch_write, transact_upsert # pydantic layer

## logger setup
logger = logging.getLogger()
logger.setLevel("INFO")

db = boto3.resource("dynamodb")
eventbridge = boto3.client('events')

## ENV variables
# will throw an error if the env variable does not exist
STAGE_NAME = os.environ.get('STAGE_NAME') or (_ for _ in ()).throw(KeyError("Environment variable 'STAGE_NAME' not found"))
ORG_TABLE_NAME_TEMPLATE = os.environ.get('ORG_TABLE_NAME_TEMPLATE') or (_ for _ in ()).throw(KeyError("Environment variable 'ORG_TABLE_NAME_TEMPLATE' not found"))
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY') or (_ for _ in ()).throw(KeyError("Environment variable 'STRIPE_API_KEY' not found"))

# setup stripe key
stripe.api_key = STRIPE_API_KEY

def _validate_includes(table, models: list[DynamoModel], eventId: str, check_live_items: bool = False):
    logger.info(f"Validating included items for bundles")
    item_ids = {item_id for m in models if m.includes for item_id in m.includes}
    if item_ids:
        client = table.meta.client
        request_keys = [
            {'PK': f'ITEM#{item_id}', 'SK': f'EVENT#{eventId}'}
            for item_id in item_ids
        ]
        resp = client.batch_get_item(RequestItems={table.name: {'Keys': request_keys}})
        found = resp.get('Responses', {}).get(table.name, [])
        found_ids = {it['PK'].split('#', 1)[1] for it in found}
        logger.info(f"Included item IDs: {item_ids}, Found item IDs: {found_ids}")
        missing = list(item_ids - found_ids)
        non_live_items = [item_id for item_id in found_ids if not any(it['status'] == 'live' for it in found if it['PK'] == f'ITEM#{item_id}')] if check_live_items else []

        response = {}

        if non_live_items:
            logger.error(f"Non-live referenced item(s) on update/create: {non_live_items}")
            response['non_live_items'] = non_live_items

        if missing:
            logger.error(f"Missing referenced item(s) on update/create: {missing}")
            response['missing_items'] = missing

        if missing or non_live_items:
            return make_response(400, {
                'message': 'Referenced item(s) not found or are not live',
                **response,
                'bundles': [BundleObject.model_validate(m.model_dump(include=BundleObject.model_fields.keys())).model_dump(mode='json')
                            for m in models
                    ]
            })

    return None

def get_one(organisationSlug: str,  eventId: str,  bundleId: str, public: bool = False, actor: str = "unknown"):
    TABLE_NAME = ORG_TABLE_NAME_TEMPLATE.replace("org_name", organisationSlug)
    table = db.Table(TABLE_NAME)
    logger.info(f"Getting bundle for {eventId} of {organisationSlug} from {TABLE_NAME}")
    blank_model = BundleModel(ksuid=bundleId, parent_event_ksuid=eventId, name="blank", organisation=organisationSlug)

    try:
        result = blank_model.query_gsi(
            table=table,
            key_condition=Key("PK").eq(f"{blank_model.PK}") & Key("SK").eq(f"{blank_model.SK}"),
            assemble_entites=False
        )
        logger.info(f"Found bundle for {eventId} of {organisationSlug}: {result}")

    except db.exceptions.ResourceNotFoundException as e:
        logger.error(f"Bundle ({bundleId}) not found for {eventId} of {organisationSlug}: {e}")
        return None
    except Exception as e:
        logger.error(f"DynamoDB query failed to get bundle ({bundleId}) for {eventId} of {organisationSlug}: {e}")
        raise Exception

    return result.to_public() if public else result

def get_all(organisationSlug: str,  eventId: str, public: bool = False, actor: str = "unknown"):
    TABLE_NAME = ORG_TABLE_NAME_TEMPLATE.replace("org_name", organisationSlug)
    table = db.Table(TABLE_NAME)
    logger.info(f"Getting bundles for {eventId} of {organisationSlug} from {TABLE_NAME}")
    blank_model = BundleModel(parent_event_ksuid=eventId, name="blank", organisation=organisationSlug)

    try:
        bundles = blank_model.query_gsi(
            table=table,
            index_name="IDXinv",
            key_condition=Key("SK").eq(blank_model.SK) & Key("PK").begins_with(f"{blank_model.PK.split('#')[0]}#")
        )
        logger.info(f"Found bundles for {eventId} of {organisationSlug}: {bundles}")
    except Exception as e:
        logger.error(f"DynamoDB query failed to get bundles for {eventId} of {organisationSlug}: {e}")
        raise Exception
    
    #! temporary fix this needs review
    if isinstance(bundles, BundleModel):
        bundles = [bundles]

    return [b.to_public() if public else b for b in bundles]

def update(request: UpdateBundleRequest, organisationSlug: str, eventId: str, actor: str = "unknown"):
    logger.info(f"Update Bundles: {request}")

    TABLE_NAME = ORG_TABLE_NAME_TEMPLATE.replace("org_name", organisationSlug)
    table = db.Table(TABLE_NAME)
    logger.info(f"Updating bundle(s) for {eventId} of {organisationSlug} into {TABLE_NAME}")

    current_time = datetime.now(timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z')
    logger.info(f"Current Time: {current_time}")

    try:
        bundle_models = [
            BundleModel.model_validate({
                **bd.model_dump(mode="json", exclude_unset=True),
                "organisation": organisationSlug,
                "parent_event_ksuid": eventId,
                "updated_at": current_time
            }) for bd in request.bundles
        ]

        # validate that referenced items in includes exist
        resp = _validate_includes(table, bundle_models, eventId)
        if resp: return resp

        result = transact_upsert(table, bundle_models)

        if result.failed and not result.successful:
            return make_response(400, {
                "message": "Failed to update any bundles.",
                "failed_bundles": [
                    {
                        "bundle": item.model_dump(mode="json"),
                        "status": "failed",
                        "reason": f.inferred
                    } for item, f in zip(result.failed, result.failures)
                ]
            })

        if result.failed and result.successful and len(result.failed) > 0 and len(result.successful) > 0:
            return make_response(207, {
                "message": "Partial success: some bundles updated successfully, others failed.",
                "successful_bundles": [
                    {
                        "bundle": item.model_dump(mode="json"),
                        "status": "updated successfully"
                    } for item in result.successful
                ],
                "failed_bundles": [
                    {
                        "item": item.model_dump(mode="json"),
                        "status": "failed",
                        "reason": f.inferred
                    } for item, f in zip(result.failed, result.failures)
                ]
            })

        return make_response(201, {
            "message": "Bundles updated successfully.",
            "bundles": [b.model_dump(mode="json") for b in result.successful],
        })
    except ValidationError as e:
        logger.error("Validation error: %s", str(e))
        logger.error(traceback.format_exc())
        return make_response(400, {
            "message": "Invalid update request",
            "error": str(e)
        })
    except ValueError as e:
        return make_response(400, {
            "message": "Invalid update request",
            "error": str(e)
        })
    except Exception as e:
        logger.error("Unexpected error: %s", str(e))
        logger.error(traceback.format_exc())
        return make_response(500, {"message": "Something went wrong."})

def create(request: CreateBundleRequest, organisationSlug: str, eventId: str, actor: str = "unknown"):
    logger.info(f"Create Bundle(s): {request}")

    TABLE_NAME = ORG_TABLE_NAME_TEMPLATE.replace("org_name",organisationSlug)
    table = db.Table(TABLE_NAME)
    logger.info(f"Adding bundle(s) for {eventId} of {organisationSlug} into {TABLE_NAME}")

    current_time = datetime.now(timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z')
    logger.info(f"Current Time: {current_time}")

    bundles_data  = request.bundles
    bundles_models = []
    for bd in bundles_data:
        bd.status = Status.draft # force new bundles to be created in draft mode        
        bundles_models.append(BundleModel.model_validate({
            **bd.model_dump(mode="json", exclude_unset=True),
            "ksuid": str(bd.ksuid) if bd.ksuid else str(KsuidMs()),
            "organisation": organisationSlug,
            "parent_event_ksuid": eventId,
            "created_at": current_time,
            "updated_at": current_time
        }))

    # validate that referenced items in includes exist
    resp = _validate_includes(table, bundles_models, eventId)
    if resp: return resp

    try:
        successful_bundles, unprocessed_bundles = batch_write(table, bundles_models)

        if len(unprocessed_bundles) > 0:
            logger.warning(f"Unprocessed bundles: {unprocessed_bundles}")
            return make_response(207, {
                "message": "Bundles created with some unprocessed bundles.",
                "bundles": [bundle.model_dump_json() for bundle in successful_bundles],
                "unprocessed": [bundle.model_dump_json() for bundle in unprocessed_bundles]
            })
        else:
            return make_response(201, {
                "message": "Bundles created successfully.",
                "bundles": [bundle.model_dump_json() for bundle in successful_bundles],
            })
    except Exception as e:
        logger.error("Unexpected error: %s", str(e))
        logger.error(traceback.format_exc())
        return make_response(500, {"message": "Something went wrong."})
    
def _rollback_created_bundle(bundle: BundleModel, table):
    try:        
        bundle.status = Status.draft
        bundle.upsert(
            table=table,
            only_set_once=["organisation", "parent_event_ksuid", "created_at", "name"],
            condition_expression="attribute_exists(PK)"
        )
        logger.info(f"Rolled back bundle {bundle.ksuid} to draft status after failure.")
    except Exception as e:
        logger.error(f"Failed to rollback bundle {bundle.ksuid} after failure: {e}")
        logger.error(traceback.format_exc())
        return False

    return True

def publish(request: PublishBundlesRequest, organisationSlug: str, eventId: str, actor: str = "unknown"):
    logger.info(f"Publish Bundles: {request}")

    TABLE_NAME = ORG_TABLE_NAME_TEMPLATE.replace("org_name",organisationSlug)
    table = db.Table(TABLE_NAME)
    logger.info(f"Publishing bundles for {eventId} of {organisationSlug}")

    current_time = datetime.now(timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z')
    logger.info(f"Current Time: {current_time}")

    if not request.bundles or request.bundles == None or request.bundles == []:
        return make_response(400, {"message": "No bundles provided for publishing."})
    
    try:
        bundle_models = [
            BundleModel.model_validate({
                "status": Status.live,
                "ksuid": bundle_ksuid,
                "name": "palceholder",
                "organisation": organisationSlug,
                "parent_event_ksuid": eventId,
                "published_at": current_time
            }) for bundle_ksuid in request.bundles
        ]

        successful_bundles, failed_bundles = [], []
        for bd in bundle_models:
            result = bd.upsert(
                table=table,
                only_set_once=["organisation", "parent_event_ksuid", "created_at", "name"],
                condition_expression="attribute_exists(PK) AND attribute_exists(primary_price) AND attribute_exists(#name) AND #status = :draft",
                extra_expression_attr_names={"#status": "status", "#name": "name"},
                extra_expression_attr_values={":draft": "draft"},
            )
            if result.success:
                bundle = BundleModel(**result.item)

                # validate that referenced items in includes exist and are live
                resp = _validate_includes(table, [bundle], eventId, check_live_items=True)
                if resp:
                    _rollback_created_bundle(bundle, table)
                    body = json.loads(resp.get("body", ""))
                    failed_bundles.append((bundle, f'{body.get("message", "Validaiton of referenced child items faild")}: Missing:{str(body.get("missing_items", []))} Drafts:{str(body.get("non_live_items", []))}'))
                    continue
                try:
                    bundle, created = create_stripe_catalog(item=bundle, organisation=organisationSlug, event_id=eventId, stripe=stripe)
                    successful_bundles.append(bundle)
                except Exception as e:
                    logger.error(f"Stripe catalog creation failed for bundle {bundle.ksuid}: {e}")
                    logger.error(traceback.format_exc())
                    _rollback_created_bundle(bundle, table)
                    failed_bundles.append((bundle, f"Stripe catalog creation failed: {str(e)}"))

                try:
                    logger.info(f"Updating bundle {bundle.ksuid} with Stripe IDs: {bundle.stripe_product_id}, {bundle.stripe_price_id}, {bundle.stripe_primary_price_id}, {bundle.stripe_secondary_price_id}, {bundle.stripe_tertiary_price_id}")
                    bundle.upsert(table=table, only_set_once=["organisation", "parent_event_ksuid", "created_at", "name", "status"])
                except Exception as e:
                    logger.error(f"Failed to update bundle {bundle.ksuid} with Stripe IDs: {e}")
                    logger.error(traceback.format_exc())

                    rollback_stripe_created(created, stripe)

                    failed_bundles.append((bundle, f"Failed to update bundle with Stripe IDs: {str(e)}"))
            elif not result.success:
                failed_bundles.append((bd, result.error if result.error else "Unknown failure"))
    except ValidationError as e:
        logger.error("Validation error: %s", str(e))
        logger.error(traceback.format_exc())
        return make_response(400, {
            "message": "Invalid publish request",
            "error": str(e)
        })
    except Exception as e:
        logger.error("Unexpected error: %s", str(e))
        logger.error(traceback.format_exc())
        return make_response(500, {"message": "Something went wrong."})
    
    response = {
        "successful_bundles": [bundle.model_dump(mode="json", exclude_none=True) for bundle in successful_bundles],
        "failed_bundles": [
            {
                "bundle": bundle.model_dump(mode="json", exclude_none=True),
                "reason": reason
            } for bundle, reason in failed_bundles
        ]
    }

    if failed_bundles:
        if successful_bundles:
            return make_response(207, {
                "message": "Partial success: some bundles published successfully, others failed.",
                **response
            })
        return make_response(400, {
            "message": "Failed to publish any bundles.",
            **response
        })

    return make_response(200, {
        "message": "Bundles published successfully.",
        **response
    })    

def lambda_handler(event, context):
    try:
        logger.info("Received event: %s", json.dumps(event, indent=2, cls=DecimalEncoder))
        parsed_event = parse_event(event)
        http_method  = event['requestContext']["http"]["method"]

        organisationSlug = event.get("pathParameters", {}).get("organisation")
        bundleId         = event.get("pathParameters", {}).get("ksuid")
        eventId          = event.get("pathParameters", {}).get("event")
        is_public        = event.get("rawPath", "").startswith("/public")
        is_publish       = event.get("rawPath", "").endswith("/bundles/publish") and not is_public
        actor            = event.get("requestContext", {}).get("accountId", "unknown")

        if not eventId: 
            return make_response(404, {"message": "Missing event ID in request path."})

        # POST /{organisation}/events
        if http_method == "POST":
            if is_publish:
                validated_request = PublishBundlesRequest(**parsed_event)
                return publish(validated_request, organisationSlug, eventId, actor)
            else:
                validated_request = CreateBundleRequest(**parsed_event)
                return create(validated_request, organisationSlug, eventId, actor)

        # GET 
        elif http_method == "GET":
            logger.info(f"{organisationSlug}:{eventId}")
            response_cls = BundleResponsePublic if is_public else BundleResponse
            list_response_cls = BundleListResponsePublic if is_public else BundleListResponse

            if bundleId:
                result = get_one(organisationSlug, eventId, bundleId, public=is_public)
                if result is None:
                    return make_response(404, {"message": "Bundle not found."})
                response = response_cls(bundle=result)
            else:
                result = get_all(organisationSlug, eventId, public=is_public)
                response = list_response_cls(bundles=result)

            return make_response(200, response.model_dump(mode="json", exclude_none=True))

        elif http_method == "PUT":
            validated_request = UpdateBundleRequest(**parsed_event)
            return update(validated_request, organisationSlug, eventId, actor)
            
        else:
            return make_response(405, {"message": "Method not allowed."})

    except ValueError as e:
        logger.error("Validation error: %s", str(e))
        logger.error(traceback.format_exc())
        return make_response(400,{"message": "Validation error.", "error": str(e)})
    except Exception as e:
        logger.error("Unexpected error: %s", str(e))
        logger.error(traceback.format_exc())
        return make_response(500, {"message": "Internal server error.", "error": str(e)})
    
