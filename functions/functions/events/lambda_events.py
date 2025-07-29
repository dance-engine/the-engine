import sys
import os

import json
import logging
import boto3
import traceback
from datetime import datetime, timezone
from botocore.exceptions import ClientError
from boto3.dynamodb.conditions import Key

from ksuid import KsuidMs # utils layer

sys.path.append(os.path.dirname(__file__))
from _shared.parser import parse_event, validate_event
from _shared.DecimalEncoder import DecimalEncoder
from _shared.naming import getOrganisationTableName, generateSlug
from _shared.helpers import make_response
from _pydantic.EventBridge import triggerEBEvent, trigger_eventbridge_event, EventType, Action # pydantic layer
from _pydantic.dynamodb import VersionConflictError # pydantic layer
from _pydantic.models.events_models import CreateEventRequest, UpdateEventRequest, EventListResponse, EventResponse, EventListResponsePublic, EventResponsePublic, EventObjectPublic, EventObject, LocationObject, Status, CategoryEnum
from _pydantic.models.models_extended import EventModel, LocationModel


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
    blank_model = EventModel(name="blank", organisation=organisationSlug)

    try:
        events = blank_model.query_gsi(
            table=table,
            index_name="gsi1", 
            key_condition=Key("gsi1PK").eq(blank_model.gsi1PK) & Key("gsi1SK").begins_with(f"{blank_model.gsi1SK.split('#')[0]}#")
        )
        logger.info(f"Found events for {organisationSlug}: {events}")
    except Exception as e:
        logger.error(f"DynamoDB query failed to get events for {organisationSlug}: {e}")
        raise Exception

    return [e.to_public() if public else e for e in events]

def get_single_event(organisationSlug: str, eventId: str, public: bool = False):
    TABLE_NAME = ORG_TABLE_NAME_TEMPLATE.replace("org_name",organisationSlug)
    table = db.Table(TABLE_NAME)
    logger.info(f"Getting events for {organisationSlug} from {TABLE_NAME}")
    blank_model = EventModel(ksuid=eventId, name="blank", organisation=organisationSlug)

    try:
        result = blank_model.query_gsi(
            table=table,
            index_name="IDXinv", 
            key_condition=Key('SK').eq(f'{blank_model.PK}'),
            assemble_entites=True
        )
        logger.info(f"Found event for {organisationSlug}: {result}")

    except ClientError as e:
        if e.response['Error']['Code'] == 'ResourceNotFoundException':
            logger.error(f"Event not found for {organisationSlug}: {e}")
            return None
        else:
            raise
        
    except ValueError as e:
        logger.error(f"Event not found for {organisationSlug}: {e}")
        return None
    
    except Exception as e:
        logger.error(f"DynamoDB query failed to get event for {organisationSlug}: {e}")
        raise Exception

    return result.to_public() if public else result

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