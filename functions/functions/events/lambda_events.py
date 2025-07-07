import sys
import os

import json
import logging
import boto3
import traceback
from datetime import datetime, timezone
from botocore.exceptions import ClientError
from boto3.dynamodb.conditions import Key

from ksuid import KsuidMs

sys.path.append(os.path.dirname(__file__))
from _shared.parser import parse_event, validate_event
from _shared.DecimalEncoder import DecimalEncoder
from _shared.naming import getOrganisationTableName, generateSlug
from _shared.EventBridge import triggerEBEvent, trigger_eventbridge_event, EventType, Action
from _shared.dynamodb import VersionConflictError
from _shared.helpers import make_response
from models_events import CreateEventRequest, UpdateEventRequest, EventListResponse, EventResponse, EventListResponsePublic, EventResponsePublic, EventObjectPublic, EventObject, LocationObject, Status, CategoryEnum
from models_extended import EventModel, LocationModel

logger = logging.getLogger()
logger.setLevel("INFO")

db = boto3.resource("dynamodb")
eventbridge = boto3.client('events')

ORG_TABLE_NAME_TEMPLATE = os.environ.get('ORG_TABLE_NAME_TEMPLATE') or (_ for _ in ()).throw(KeyError("Environment variable 'ORG_TABLE_NAME_TEMPLATE' not found"))

def _preprocess_event_item(item: dict) -> dict:
    if 'status' in item and isinstance(item["status"], str):
        try:
            item["status"] = Status(item['status'])
        except ValueError:
            pass
    if 'category' in item and isinstance(item["category"], str):
        try:
            item["category"] = [CategoryEnum(item["category"])]    
        except ValueError:
            pass
    if 'category' in item and isinstance(item["category"], list):
        try:
            item["category"] = [CategoryEnum(c) for c in item["category"]]    
        except ValueError:
            pass
    return item

def update_event(request_data: UpdateEventRequest, organisation_slug: str, actor: str = "unknown"):
    logger.info(f"Updating Event: {request_data.model_dump}")

    TABLE_NAME = ORG_TABLE_NAME_TEMPLATE.replace("org_name",organisation_slug)
    table = db.Table(TABLE_NAME)
    logger.info(f"Updating event for {organisation_slug} into {TABLE_NAME}")

    current_time = datetime.now(timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z')
    logger.info(f"Current Time: {current_time}")

    event_data = request_data.event

    try:
        event_model = EventModel.model_validate({
            **event_data.model_dump(mode="json", exclude_unset=True),
            "updated_at":current_time,
            "organisation": organisation_slug,
        })

        if event_data.location:
            location_model = LocationModel.model_validate({
                **event_data.location.model_dump(mode="json", exclude_unset=True),
                "organisation": organisation_slug,
                "parent_event_ksuid": event_model.ksuid,
                "updated_at": current_time
            })

        event_response = event_model.upsert(table, ["event_slug", "created_at"])
        location_response = location_model.upsert(table, ["created_at"])
        trigger_eventbridge_event(eventbridge, 
                                  source="dance-engine.core", 
                                  resource_type=EventType.event,
                                  action=Action.updated,
                                  organisation=organisation_slug,
                                  resource_id=event_model.PK,
                                  data=request_data.model_dump(mode="json"),
                                  meta={"accountId":actor})
        return make_response(201, {
            "message": "Event updated successfully.",
            "event": event_model.model_dump(mode="json"),
        })
    except VersionConflictError as e:
        logger.error(f"Version Conflict")
        return make_response(409, {
            "message": "Version conflict",
            "resource": e.model.PK,
            "your_version": e.incoming_version
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

def get_events(organisationSlug: str, public: bool = False):
    TABLE_NAME = ORG_TABLE_NAME_TEMPLATE.replace("org_name",organisationSlug)
    table = db.Table(TABLE_NAME)
    logger.info(f"Getting events for {organisationSlug} from {TABLE_NAME}")

    response = table.query(
                IndexName="gsi1",
                KeyConditionExpression=Key("gsi1PK").eq(f"EVENTLIST#{organisationSlug}") & Key("gsi1SK").begins_with("EVENT#"),
                ScanIndexForward=True
            )
    
    events = []
    for item in response.get("Items", []):
        try:
            event_model = EventObject.model_validate(_preprocess_event_item(item))
            event_model_public = EventObjectPublic.model_validate(event_model.model_dump(include=EventObjectPublic.model_fields.keys()))
            output = event_model_public if public else event_model
            events.append(output)
        except Exception as e:
            logger.error(traceback.format_exc())
            logger.warning(f"SKipping event item: {e}")
    
    return events 

def get_single_event(organisationSlug: str, eventId: str, public: bool = False):
    TABLE_NAME = ORG_TABLE_NAME_TEMPLATE.replace("org_name",organisationSlug)
    table = db.Table(TABLE_NAME)
    logger.info(f"Getting event {eventId} for {organisationSlug} from {TABLE_NAME} / ")

    try:
        response = table.query(
            IndexName='IDXinv',  
            KeyConditionExpression=Key('SK').eq(f'EVENT#{eventId}')
        )
        items = response.get("Items", None)
        logger.info(f"Fetched {len(items)} from dynamodb: {items}")
    except Exception as e:
        logger.error(f"DynamoDB query failed for event {eventId}: {e}")
        raise Exception
    
    event_items = [item for item in items if item.get("entity_type") == "EVENT"]
    location_items = [item for item in items if item.get("entity_type") == "LOCATION"]
    history_items = [item for item in items if item.get("entity_type") == "HISTORY"]
    logger.info(history_items)

    if len(event_items) == 0:
        logger.warning(f"No EVENT entity found for event ID {eventId}")
        return None
    
    if len(event_items) > 1:
        logger.error(f"Multiple EVENT entities found for {eventId}.")
        raise Exception
    
    event_item = event_items[0] 
    
    if location_items:
        if len(location_items) > 1:
            logger.warning(f"Multiple LOCATION entities found for event {eventId}. Using the first.")

        location_item = location_items[0]
        try:
            location_model = LocationObject.model_validate(location_item)
            event_item["location"] = location_model.model_dump()
        except Exception as e:
            logger.warning(f"Failed to validate location object for event {eventId}: {e}")
            event_item["location"] = None  # fallback gracefully

    if history_items:
        event_item["history"] = history_items

    try:
        event_model = EventObject.model_validate(_preprocess_event_item(event_item))
        event_model_public = EventObjectPublic.model_validate(event_model.model_dump(include=EventObjectPublic.model_fields.keys()))
        return event_model_public if public else event_model
    except Exception as e:
        logger.warning("Validation error in get_single_event: %s", str(e))
        return None

def create_event(request_data: CreateEventRequest, organisation_slug: str, actor: str = "unknown"):
    """
    [X] Checke for KSUID and create if needed
    [X] Validate Input 
    [ ] Store objects in a tranactionalized dynamoDB call
    [?] Return if it worked or not
    """
    logger.info(f"Create Event: {request_data}")

    TABLE_NAME = ORG_TABLE_NAME_TEMPLATE.replace("org_name",organisation_slug)
    table = db.Table(TABLE_NAME)
    logger.info(f"Adding event for {organisation_slug} into {TABLE_NAME}")

    current_time = datetime.now(timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z')
    logger.info(f"Current Time: {current_time}")


    event_data  = request_data.event
    event_model = EventModel.model_validate({
        **event_data.model_dump(mode="json", exclude_unset=True),
        "ksuid": str(event_data.ksuid) if event_data.ksuid else str(KsuidMs()),
        "organisation": organisation_slug,
        "number_sold": 0,
        "created_at": current_time,
        "updated_at": current_time,
        "version": event_data.version or 0
        })

    location_data  = event_data.location
    location_model = LocationModel.model_validate({
        **location_data.model_dump(mode="json", exclude_unset=True),
        "ksuid": str(location_data.ksuid) if location_data.ksuid else str(KsuidMs()),
        "organisation": organisation_slug,
        "parent_event_ksuid": event_model.ksuid,
        "created_at": current_time,
        "updated_at": current_time
        })

    try:
        event_response = event_model.upsert(table,["event_slug", "created_at"])
        location_response = location_model.upsert(table, ["created_at"])
        triggerEBEvent(eventbridge, "events", "UpsertEvent", event_response)
        return make_response(201, {
            "message": "Event created successfully.",
            "event": event_model.model_dump_json(),
        })
    except VersionConflictError as e:
        logger.error(f"Version Conflict")
        return make_response(409, {
            "message": "Version conflict",
            "resource": e.model.PK,
            "your_version": e.incoming_version
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
        eventId          = event.get("pathParameters", {}).get("ksuid",None)
        is_public        = event.get("rawPath", "").startswith("/public")
        actor            = event.get("requestContext", {}).get("accountId", "unknown")

        # POST /{organisation}/events
        if http_method == "POST":
            validated_request = CreateEventRequest(**parsed_event)
            return create_event(validated_request, organisationSlug, actor)

        # GET 
        elif http_method == "GET":
            logger.info(f"{organisationSlug}:{eventId}")
            response_cls = EventResponsePublic if is_public else EventResponse
            list_response_cls = EventListResponsePublic if is_public else EventListResponse

            if eventId:
                result = get_single_event(organisationSlug, eventId, public=is_public)
                if result is None:
                    return make_response(404, {"message": "Event not found."})
                response = response_cls(event=result)
            else:
                result = get_events(organisationSlug, public=is_public)
                response = list_response_cls(events=result)
            
            return make_response(200, response.model_dump(mode="json", exclude_none=True))                

        elif http_method == "PUT":
            if not eventId:
                return make_response(404, {"message": "Missing event ID in request"})
            validated_request = UpdateEventRequest(**parsed_event)
            return update_event(validated_request, organisationSlug, actor)
            
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