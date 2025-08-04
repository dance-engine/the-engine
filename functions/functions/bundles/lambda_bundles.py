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

## custom scripts
sys.path.append(os.path.dirname(__file__))
from _shared.parser import parse_event
from _shared.DecimalEncoder import DecimalEncoder
from _shared.helpers import make_response
from _pydantic.models.bundles_models import BundleObject, BundleResponse, CreateBundleRequest, BundleListResponse, BundleResponsePublic, BundleListResponsePublic, UpdateBundleRequest
from _pydantic.models.models_extended import BundleModel
#from _pydantic.EventBridge import triggerEBEvent, trigger_eventbridge_event, EventType, Action # pydantic layer
#from _pydantic.dynamodb import VersionConflictError # pydantic layer
from _pydantic.dynamodb import batch_write, transact_upsert, VersionConflictError # pydantic layer

## logger setup
logger = logging.getLogger()
logger.setLevel("INFO")

db = boto3.resource("dynamodb")
eventbridge = boto3.client('events')

## ENV variables
# will throw an error if the env variable does not exist
STAGE_NAME = os.environ.get('STAGE_NAME') or (_ for _ in ()).throw(KeyError("Environment variable 'STAGE_NAME' not found"))
ORG_TABLE_NAME_TEMPLATE = os.environ.get('ORG_TABLE_NAME_TEMPLATE') or (_ for _ in ()).throw(KeyError("Environment variable 'ORG_TABLE_NAME_TEMPLATE' not found"))

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

        successful_bundles, failed_bundles = transact_upsert(table, bundle_models)

        if failed_bundles:
            return make_response(207, {
                "message": "Some bundles updated successfully, others failed.",
                "bundles": [b.model_dump(mode="json") for b in successful_bundles],
                "unprocessed": [b.model_dump(mode="json") for b in failed_bundles]
            })

        return make_response(201, {
            "message": "Bundles updated successfully.",
            "bundles": [b.model_dump(mode="json") for b in successful_bundles],
        })
    except VersionConflictError as e:
        logger.error("Version Conflict")
        return make_response(409, {
            "message": "Version conflict",
            "resource": [m.PK for m in e.models],
            "your_version": e.incoming_version
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
        bundles_models.append(BundleModel.model_validate({
            **bd.model_dump(mode="json", exclude_unset=True),
            "ksuid": str(bd.ksuid) if bd.ksuid else str(KsuidMs()),
            "organisation": organisationSlug,
            "parent_event_ksuid": eventId,
            "created_at": current_time,
            "updated_at": current_time
        }))

    # validate that referenced items in includes exist
    item_ids = {item_id for bm in bundles_models if bm.includes for item_id in bm.includes}
    if item_ids:
        client = table.meta.client
        request_keys = [
            {'PK': f'ITEM#{item_id}', 'SK': f'EVENT#{eventId}'}
            for item_id in item_ids
        ]
        resp = client.batch_get_item(RequestItems={TABLE_NAME: {'Keys': request_keys}})
        found_items = resp.get('Responses', {}).get(TABLE_NAME, [])
        found_ids = {item['PK'].split('#', 1)[1] for item in found_items}
        missing = list(item_ids - found_ids)
        if missing:
            logger.error(f"Cannot create bundle(s): missing item(s): {missing}")
            return make_response(400, {
                'message': 'Cannot create bundle(s): referenced item(s) not found',
                'missing_items': missing
            })

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

def lambda_handler(event, context):
    try:
        logger.info("Received event: %s", json.dumps(event, indent=2, cls=DecimalEncoder))
        parsed_event = parse_event(event)
        http_method  = event['requestContext']["http"]["method"]

        organisationSlug = event.get("pathParameters", {}).get("organisation")
        bundleId         = event.get("pathParameters", {}).get("ksuid")
        eventId          = event.get("pathParameters", {}).get("event")
        is_public        = event.get("rawPath", "").startswith("/public")
        actor            = event.get("requestContext", {}).get("accountId", "unknown")

        if not eventId: 
            return make_response(404, {"message": "Missing event ID in request path."})

        # POST /{organisation}/events
        if http_method == "POST":
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
    
