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
from _pydantic.models.items_models import CreateItemRequest, ItemObject, ItemResponse, ItemListResponse, ItemResponsePublic, ItemListResponsePublic, UpdateItemRequest, Status, PublishItemsRequest
from _pydantic.models.models_extended import ItemModel
# from _pydantic.EventBridge import triggerEBEvent, trigger_eventbridge_event, EventType, Action # pydantic layer
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

## write here the code which is called from the handler
def get_one(organisationSlug: str,  eventId: str,  itemId: str, public: bool = False, actor: str = "unknown"):
    TABLE_NAME = ORG_TABLE_NAME_TEMPLATE.replace("org_name",organisationSlug)
    table = db.Table(TABLE_NAME)
    logger.info(f"Getting items for {eventId} of {organisationSlug} from {TABLE_NAME}")
    blank_model = ItemModel(ksuid=itemId, parent_event_ksuid=eventId, name="blank", organisation=organisationSlug)

    try:
        result = blank_model.query_gsi(
            table=table,
            key_condition=Key('PK').eq(f'{blank_model.PK}') & Key('SK').eq(f'{blank_model.SK}'),
            assemble_entites=False
        )
        logger.info(f"Found item for {eventId} of {organisationSlug}: {result}")

    except db.exceptions.ResourceNotFoundException as e:
        logger.error(f"Item ({itemId}) not found for {eventId} of {organisationSlug}: {e}")
        return None
    except Exception as e:
        logger.error(f"DynamoDB query failed to get item ({itemId}) for {eventId} of {organisationSlug}: {e}")
        raise Exception
    
    if public and getattr(result, "status", None) != "live":
        return None    

    return result.to_public() if public else result

def get_all(organisationSlug: str,  eventId: str, public: bool = False, actor: str = "unknown"):
    TABLE_NAME = ORG_TABLE_NAME_TEMPLATE.replace("org_name",organisationSlug)
    table = db.Table(TABLE_NAME)
    logger.info(f"Getting events for {organisationSlug} from {TABLE_NAME}")
    blank_model = ItemModel(parent_event_ksuid=eventId, ksuid="blank", name="blank", organisation=organisationSlug)

    try:
        items = blank_model.query_gsi(
            table=table,
            index_name="IDXinv", 
            key_condition=Key("SK").eq(blank_model.SK) & Key("PK").begins_with(f"{blank_model.PK.split('#')[0]}#")
        )
        logger.info(f"Found items for {eventId} of {organisationSlug}: {items}")
    except Exception as e:
        logger.error(f"DynamoDB query failed to get items for {eventId} of {organisationSlug}: {e}")
        raise Exception

    #! temporary fix this needs review
    if isinstance(items, ItemModel):
        items = [items]

    if public:
        items = [i for i in items if getattr(i, "status", None) == "live"]

    return [i.to_public() if public else i for i in items]

def update(request: UpdateItemRequest, organisationSlug: str, eventId: str, actor: str = "unknown"):
    logger.info(f"Update Items: {request}")

    TABLE_NAME = ORG_TABLE_NAME_TEMPLATE.replace("org_name",organisationSlug)
    table = db.Table(TABLE_NAME)
    logger.info(f"Updating item(s) for {eventId} of {organisationSlug} into {TABLE_NAME}")

    current_time = datetime.now(timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z')
    logger.info(f"Current Time: {current_time}")

    if not request.items or request.items == None:
        return make_response(400, {"message": "No items provided for update."})

    try:
        item_models = [
            ItemModel.model_validate({
                **item_data.model_dump(mode="json", exclude_unset=True),
                "organisation": organisationSlug,
                "parent_event_ksuid": eventId,
                "updated_at": current_time
            }) for item_data in request.items
        ]

        result = transact_upsert(table=table, 
                                 items=item_models,
                                 condition_expression="attribute_exists(PK) AND #status = :draft",
                                 extra_expression_attr_names={"#status": "status"},
                                 extra_expression_attr_values={":draft": "draft"},
                                 only_set_once=["organisation", "parent_event_ksuid", "created_at", "status"])
        
        if result.failures and result.failures[0].reason == "conditional_failed":
            return make_response(400, {
                "message": "Failed to update items. All items must exist and be in 'draft' status to be updated.",
                "failed_items": [
                    {
                        "item": item.model_dump(mode="json"),
                        "status": "failed",
                        "reason": f.inferred
                    } for item, f in zip(result.failed, result.failures)
                ]
            })

        if result.failed and not result.successful:
            return make_response(400, {
                "message": "Failed to update any items.",
                "failed_items": [
                    {
                        "item": item.model_dump(mode="json"),
                        "status": "failed",
                        "reason": f.inferred
                    } for item, f in zip(result.failed, result.failures)
                ]
            })

        if result.failed and result.successful and len(result.failed) > 0 and len(result.successful) > 0:
            return make_response(207, {
                "message": "Partial success: some items updated successfully, others failed.",
                "successful_items": [
                    {
                        "item": item.model_dump(mode="json"),
                        "status": "updated successfully"
                    } for item in result.successful
                ],
                "failed_items": [
                    {
                        "item": item.model_dump(mode="json"),
                        "status": "failed",
                        "reason": f.inferred
                    } for item, f in zip(result.failed, result.failures)
                ]
            })

        return make_response(201, {
            "message": "Items updated successfully.",
            "items": [item.model_dump(mode="json") for item in result.successful],
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

def create(request: CreateItemRequest, organisationSlug: str, eventId: str, actor: str = "unknown"):
    logger.info(f"Create Items: {request}")

    TABLE_NAME = ORG_TABLE_NAME_TEMPLATE.replace("org_name",organisationSlug)
    table = db.Table(TABLE_NAME)
    logger.info(f"Adding items for {eventId} of {organisationSlug} into {TABLE_NAME}")

    current_time = datetime.now(timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z')
    logger.info(f"Current Time: {current_time}")

    items_data  = request.items
    item_models = []
    for item_data in items_data:
        item_data.status = Status.draft # force new items to be created in draft mode
        item_models.append(ItemModel.model_validate({
            **item_data.model_dump(mode="json", exclude_unset=True),
            "ksuid": str(item_data.ksuid) if item_data.ksuid else str(KsuidMs()),
            "organisation": organisationSlug,
            "parent_event_ksuid": eventId,
            "created_at": current_time,
            "updated_at": current_time
        }))
    
    try:
        successful_items, unprocessed_items = batch_write(table, item_models)

        if len(unprocessed_items) > 0:
            logger.warning(f"Unprocessed items: {unprocessed_items}")
            return make_response(207, {
                "message": "Items created with some unprocessed items.",
                "items": [item.model_dump_json() for item in successful_items],
                "unprocessed": [item.model_dump_json() for item in unprocessed_items]
            })
        else:
            return make_response(201, {
                "message": "Items created successfully.",
                "items": [item.model_dump_json() for item in successful_items],
            })
    except Exception as e:
        logger.error("Unexpected error: %s", str(e))
        logger.error(traceback.format_exc())
        return make_response(500, {"message": "Something went wrong."})
    
def publish_items(request: PublishItemsRequest, organisationSlug: str, eventId: str, actor: str = "unknown"):
    logger.info(f"Publish Items: {request}")

    TABLE_NAME = ORG_TABLE_NAME_TEMPLATE.replace("org_name",organisationSlug)
    table = db.Table(TABLE_NAME)
    logger.info(f"Publishing items for {eventId} of {organisationSlug}")

    current_time = datetime.now(timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z')
    logger.info(f"Current Time: {current_time}")

    if not request.items or request.items == None or request.items == []:
        return make_response(400, {"message": "No items provided for publishing."})

    # Update Item with ReturnValues ALL_NEW to get updated item back
    #    Condition: attribute_exists(PK) AND attribute_exists(primary_price) AND attribute_exists(name) AND #status = :draft
    # If not failed, create stripe catalog for the item; else append to failed list with reason
    # If stripe fails, rollback item updated to live; else append to successful list
    # Update successful items with product and price ids from stripe

    try:
        item_models = [
            ItemModel.model_validate({
                "status": Status.live,
                "ksuid": item_ksuid,
                "name": "placeholder",
                "organisation": organisationSlug,
                "parent_event_ksuid": eventId,
                "updated_at": current_time
            }) for item_ksuid in request.items
        ]

        successful_items, failed_items = [], []
        for it in item_models:
            result = it.upsert(
                table=table,
                only_set_once=["organisation", "parent_event_ksuid", "created_at", "name"],
                condition_expression="attribute_exists(PK) AND attribute_exists(primary_price) AND attribute_exists(#name) AND #status = :draft",
                extra_expression_attr_names={"#status": "status", "#name": "name"},
                extra_expression_attr_values={":draft": "draft"},
            )
            if result.success:
                item = ItemModel(**result.item)
                try:
                    item, created = create_stripe_catalog(item=item, organisation=organisationSlug, event_id=eventId, stripe=stripe)
                    successful_items.append(item)
                except Exception as e:
                    logger.error(f"Stripe catalog creation failed for item {item.ksuid}: {e}")
                    logger.error(traceback.format_exc())
                    # rollback item status to draft
                    try:
                        item.status = Status.draft
                        item.upsert(
                            table=table,
                            only_set_once=["organisation", "parent_event_ksuid", "created_at", "name"],
                            condition_expression="attribute_exists(PK)",
                        )
                        logger.info(f"Rolled back item {item.ksuid} to draft status after Stripe failure.")
                    except Exception as rollback_e:
                        logger.error(f"Failed to rollback item {item.ksuid} after Stripe failure: {rollback_e}")
                        logger.error(traceback.format_exc())
                    failed_items.append((item, f"Stripe catalog creation failed: {str(e)}"))
                try:
                    logger.info(f"Updating item {item.ksuid} with Stripe IDs: {item.stripe_product_id}, {item.stripe_price_id}, {item.stripe_primary_price_id}, {item.stripe_secondary_price_id}, {item.stripe_tertiary_price_id}")
                    item.upsert(table=table, only_set_once=["organisation", "parent_event_ksuid", "created_at", "name", "status"])
                except Exception as e:
                    logger.error(f"Failed to update item {item.ksuid} with Stripe IDs: {e}")
                    logger.error(traceback.format_exc())

                    rollback_stripe_created(created, stripe)

                    failed_items.append((item, f"Failed to update item with Stripe IDs: {str(e)}"))
            elif not result.success:
                failed_items.append((it, result.error if result.error else "Unknown failure"))
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
        "successful_items": [item.model_dump(mode="json", exclude_none=True) for item in successful_items],
        "failed_items": [
            {
                "item": item.model_dump(mode="json", exclude_none=True),
                "reason": reason
            } for item, reason in failed_items
        ]
    }

    if failed_items:
        if successful_items:
            return make_response(207, {
                "message": "Partial success: some items published successfully, others failed.",
                **response
            })
        return make_response(400, {
            "message": "Failed to publish any items.",
            **response
        })

    return make_response(200, {
        "message": "Items published successfully.",
        **response
    })

def lambda_handler(event, context):
    try:
        logger.info("Received event: %s", json.dumps(event, indent=2, cls=DecimalEncoder))
        parsed_event = parse_event(event)
        http_method  = event['requestContext']["http"]["method"]

        organisationSlug = event.get("pathParameters", {}).get("organisation")
        itemId           = event.get("pathParameters", {}).get("ksuid")
        eventId          = event.get("pathParameters", {}).get("event")
        is_public        = event.get("rawPath", "").startswith("/public")
        is_publish       = event.get("rawPath", "").endswith("/items/publish") and not is_public
        actor            = event.get("requestContext", {}).get("accountId", "unknown")

        if not eventId: 
            return make_response(404, {"message": "Missing event ID in request path."})

        # POST /{organisation}/events
        if http_method == "POST":
            if is_publish:
                validated_request = PublishItemsRequest(**parsed_event)
                return publish_items(validated_request, organisationSlug, eventId, actor)
            else:
                validated_request = CreateItemRequest(**parsed_event)
                return create(validated_request, organisationSlug, eventId, actor)

        # GET 
        elif http_method == "GET":
            logger.info(f"{organisationSlug}:{eventId}")
            response_cls = ItemResponsePublic if is_public else ItemResponse
            list_response_cls = ItemListResponsePublic if is_public else ItemListResponse

            if itemId:
                result = get_one(organisationSlug, eventId, itemId, public=is_public)
                if result is None:
                    return make_response(404, {"message": "Item not found."})
                response = response_cls(item=result)
            else:
                result = get_all(organisationSlug, eventId, public=is_public)
                response = list_response_cls(items=result)
            
            return make_response(200, response.model_dump(mode="json", exclude_none=True))

        elif http_method == "PUT":
            validated_request = UpdateItemRequest(**parsed_event)
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
    