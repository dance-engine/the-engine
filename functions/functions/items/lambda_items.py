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
from _pydantic.models.items_models import CreateItemRequest, ItemObject, ItemResponse, ItemListResponse, ItemResponsePublic, ItemListResponsePublic, UpdateItemRequest
from _pydantic.models.models_extended import ItemModel
# from _pydantic.EventBridge import triggerEBEvent, trigger_eventbridge_event, EventType, Action # pydantic layer
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

    return result.to_public() if public else result

def get_all(organisationSlug: str,  eventId: str, public: bool = False, actor: str = "unknown"):
    TABLE_NAME = ORG_TABLE_NAME_TEMPLATE.replace("org_name",organisationSlug)
    table = db.Table(TABLE_NAME)
    logger.info(f"Getting events for {organisationSlug} from {TABLE_NAME}")
    blank_model = ItemModel(parent_event_ksuid=eventId, name="blank", organisation=organisationSlug)

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

    return [i.to_public() if public else i for i in items]

def update(request: UpdateItemRequest, organisationSlug: str, eventId: str, actor: str = "unknown"):
    logger.info(f"Update Items: {request}")

    TABLE_NAME = ORG_TABLE_NAME_TEMPLATE.replace("org_name",organisationSlug)
    table = db.Table(TABLE_NAME)
    logger.info(f"Updating item(s) for {eventId} of {organisationSlug} into {TABLE_NAME}")

    current_time = datetime.now(timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z')
    logger.info(f"Current Time: {current_time}")

    try:
        item_models = [
            ItemModel.model_validate({
                **item_data.model_dump(mode="json", exclude_unset=True),
                "organisation": organisationSlug,
                "parent_event_ksuid": eventId,
                "updated_at": current_time
            }) for item_data in request.items
        ]

        successful_items, failed_items = transact_upsert(table, item_models)

        if failed_items:
            return make_response(207, {
                "message": "Some items updated successfully, others failed.",
                "items": [item.model_dump(mode="json") for item in successful_items],
                "unprocessed": [item.model_dump(mode="json") for item in failed_items]
            })

        return make_response(201, {
            "message": "Items updated successfully.",
            "items": [item.model_dump(mode="json") for item in successful_items],
        })
    except VersionConflictError as e:
        logger.error(f"Version Conflict")
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

def lambda_handler(event, context):
    try:
        logger.info("Received event: %s", json.dumps(event, indent=2, cls=DecimalEncoder))
        parsed_event = parse_event(event)
        http_method  = event['requestContext']["http"]["method"]

        organisationSlug = event.get("pathParameters", {}).get("organisation")
        itemId           = event.get("pathParameters", {}).get("ksuid")
        eventId          = event.get("pathParameters", {}).get("event")
        is_public        = event.get("rawPath", "").startswith("/public")
        actor            = event.get("requestContext", {}).get("accountId", "unknown")

        if not eventId: 
            return make_response(404, {"message": "Missing event ID in request path."})

        # POST /{organisation}/events
        if http_method == "POST":
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
    