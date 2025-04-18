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
from _shared.EventBridge import triggerEBEvent
from _shared.dynamodb import upsert, VersionConflictError
from _shared.helpers import make_response
from models_events import CreateEventRequest
from models_extended import EventModel, LocationModel

logger = logging.getLogger()
logger.setLevel("INFO")

db = boto3.resource("dynamodb")
eventbridge = boto3.client('events')

ORG_TABLE_NAME_TEMPLATE = os.environ.get('ORG_TABLE_NAME_TEMPLATE') or (_ for _ in ()).throw(KeyError("Environment variable 'ORG_TABLE_NAME_TEMPLATE' not found"))

def get_events(organisationSlug):
    TABLE_NAME = ORG_TABLE_NAME_TEMPLATE.replace("org_name",organisationSlug)
    table = db.Table(TABLE_NAME)
    logger.info(f"Getting events for {organisationSlug} from {TABLE_NAME}")

    response = table.query(
                IndexName="gsi1",
                KeyConditionExpression=Key("gsi1PK").eq(f"EVENTLIST#{organisationSlug}") & Key("gsi1SK").begins_with("EVENT#"),
                ScanIndexForward=True
            )
    events = response.get("Items", [])
    return events

def get_single_event(organisationSlug,eventId):
    TABLE_NAME = ORG_TABLE_NAME_TEMPLATE.replace("org_name",organisationSlug)
    table = db.Table(TABLE_NAME)
    logger.info(f"Getting event {eventId} for {organisationSlug} from {TABLE_NAME} / ")

    # response = table.get_item(
    #     Key={ 'PK': f'EVENT#{eventId}', 'SK': f'EVENT#{eventId}'}
    # )
    response = table.query(
        IndexName='IDXinv',  # Replace with your actual index name
        KeyConditionExpression=Key('SK').eq(f'EVENT#{eventId}')
    )
    event_related_items = response.get("Items", None)
    if not event_related_items:
        logger.info(f"Event not found {event_related_items}")
        return []
    else: 
        logger.info(f"Event Related Response {event_related_items}")
        event_item = event_related_items[0] #! BAd Code! need to think about how much checking is needed
        event_item["category"] = [item.strip() for item in event_item["category"].split(',')]
        event_item["location"] = {
            "name": event_related_items[1].get("name"),
            "address": event_related_items[1].get("address"),
            "lat": event_related_items[1].get("lat"),
            "lng": event_related_items[1].get("lng"),
            "ksuid": event_related_items[1].get("ksuid"),
        }
        # event = response.get("Items", {})
    return event_item

def create_event(request_data: CreateEventRequest, organisation_slug: str):
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

    event_data      = request_data.event
    event_model = EventModel(
        **event_data.model_dump_json(),
        ksuid=KsuidMs.from_base62(event_data.ksuid) if event_data.ksuid else KsuidMs(),
        organisation=organisation_slug,
        number_sold=0,
        created_at=current_time,
        updated_at=current_time,
        version=event_data.version or 0
    )

    location_data   = event_data.location
    location_model = LocationModel(
        **location_data.model_dump_json(),
        ksuid=KsuidMs.from_base62(location_data.ksuid) if location_data.ksuid else KsuidMs(),
        organisation=organisation_slug,
        parent_event_ksuid=event_data.ksuid,
        created_at=current_time,
        updated_at=current_time
    )

    try:
        event_response = upsert(table, event_model, ["event_slug", "created_at"])
        location_response = upsert(table, location_model, ["created_at"])
        #TODO trigger an EventBridge event
        return make_response(201, {
            "message": "Event created successfully.",
            "event": event_model.model_dump_json(),
        })
    except VersionConflictError as e:
        logger.error(f"Version Conflict")
        return make_response(409, {
            "message": "Version conflict",
            "resource": e.model.pk(),
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

        # POST /{organisation}/events
        if http_method == "POST":
            validated_request = CreateEventRequest(**parsed_event)

            created_event = create_event(validated_request, organisationSlug)

            # Review
            # if created_event is None:
            #     return { "statusCode": 400, "headers": { "Content-Type": "application/json" }, "body": json.dumps({"message": "Event with this name already exists."})}

            return {"statusCode": 201, "headers": { "Content-Type": "application/json" }, "body": json.dumps({"message": "Event created successfully.", "event": created_event}, cls=DecimalEncoder)}

        elif http_method == "GET":
            logger.info(f"{organisationSlug}:{eventId}")
            events = [get_single_event(organisationSlug,eventId)] if eventId else get_events(organisationSlug)
            if events is None:
                return {"statusCode": 404, "headers": { "Content-Type": "application/json" }, "body": json.dumps({"message": "No Events found."})}
            return {"statusCode": 200, "headers": { "Content-Type": "application/json" }, "body": json.dumps(events, cls=DecimalEncoder)}

        elif http_method == "PUT":
            return {"statusCode": 405, "headers": { "Content-Type": "application/json" }, "body": json.dumps({"message": "Method not implemented."}, cls=DecimalEncoder)}
        
        else:
            return {"statusCode": 405, "headers": { "Content-Type": "application/json" }, "body": json.dumps({"message": "Method not allowed."})}

    except ValueError as e:
        logger.error("Validation error: %s", str(e))
        logger.error(traceback.format_exc())
        return {"statusCode": 400, "body": json.dumps({"message": "Validation error.", "error": str(e)})}
    except Exception as e:
        logger.error("Unexpected error: %s", str(e))
        logger.error(traceback.format_exc())
        return {"statusCode": 500, "body": json.dumps({"message": "Internal server error.", "error": str(e)})}