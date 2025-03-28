import json
import logging
import os
from datetime import datetime, timezone
import re
import uuid
import traceback
from decimal import Decimal
import boto3
from boto3.dynamodb.conditions import Key
from botocore.exceptions import ClientError
from _shared.parser import parse_event, validate_event
from _shared.DecimalEncoder import DecimalEncoder
# import inflection

from ksuid import KsuidMs

logger = logging.getLogger()
logger.setLevel("INFO")

db = boto3.resource("dynamodb")
ORG_TABLE_NAME_TEMPLATE = os.environ.get("ORG_TABLE_NAME_TEMPLATE")

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

def create_event(event_data,organisationSlug):
    """
    # TODO implement
    Checke for KSUID and create if needed
    Validate Input 
    Store objects in a tranactionalized dynamoDB call
    Return if it worked or not"
    """

    logger.info(f"Create Event: {event_data}")
    TABLE_NAME = ORG_TABLE_NAME_TEMPLATE.replace("org_name",organisationSlug)
    table = db.Table(TABLE_NAME)
    logger.info(f"Adding event for {organisationSlug} into {TABLE_NAME}")

    clientKsuid = KsuidMs.from_base62(event_data.get('ksuid'))
    location_data = event_data.get('location')
    current_time = datetime.now(timezone.utc).isoformat()
    event_item = {
        "ksuid":            f"{clientKsuid}",
        "event_slug":       f"{generate_slug(event_data.get('name'))}",
        "organisation":     organisationSlug,
        "type":             "EVENT",
        "name":             event_data.get('name'),
        "starts_at":        event_data.get("starts_at"),
        "ends_at":          event_data.get("ends_at"),
        "category":         ", ".join(str(cat) for cat in event_data.get("category")),
        "total_capacity":   event_data.get("capacity"),
        "number_sold":      0,
        "created_at":       current_time,
        "updated_at":       current_time,
        "description":      event_data.get("description"),
        "gsi1PK":           f"EVENTLIST#{organisationSlug}",
        "gsi1SK":           f"EVENT#{clientKsuid}"
    }
    

    try:
        response = upsert_event(table,clientKsuid,event_item, ["event_slug","created_at"])
    except ClientError as e:
        if e.response['Error']['Code'] == 'ConditionalCheckFailedException':
            logger.error(f"Item already exists! {event_item}")
        else:
            raise
    return event_item, response

def upsert_event(table, ksuid: str, item: dict, only_set_once: list = []):
    update_parts = []
    expression_attr_names = {}
    expression_attr_values = {}

    for key, value in item.items():
        name_placeholder = f"#{key}"
        value_placeholder = f":{key}"
        expression_attr_names[name_placeholder] = key
        expression_attr_values[value_placeholder] = value

        if key in only_set_once:
            update_parts.append(f"{name_placeholder} = if_not_exists({name_placeholder}, {value_placeholder})")
        else:
            update_parts.append(f"{name_placeholder} = {value_placeholder}")

    update_expression = "SET " + ", ".join(update_parts)

    response = table.update_item(
        Key={"PK": f"EVENT#{ksuid}", "SK": f"EVENT#{ksuid}"},
        UpdateExpression=update_expression,
        ExpressionAttributeNames=expression_attr_names,
        ExpressionAttributeValues=expression_attr_values,
        ReturnValues="ALL_NEW"
    )
    return response

def trigger_eb_event():
    return True

def generate_slug(name):
    """
    Generates a slug based on the name
    """
    base_slug = re.sub(r'[^a-zA-Z0-9]+', '-', name.strip().lower()).strip('-')
    return f"{base_slug}"

def lambda_handler(event, context):
    try:
        logger.info("Received event: %s", json.dumps(event, indent=2, cls=DecimalEncoder))
        parsed_event = parse_event(event)
        http_method = event['requestContext']["http"]["method"]
        organisationSlug = event.get("pathParameters", {}).get("organisation")


        if http_method == "POST":
            validated_event = validate_event(parsed_event, ["name", "starts_at", "ends_at", "location", "capacity"])
            valiedated_location = validate_event(validated_event["location"], ["name", "lat", "lng"])

            created_event = create_event(validated_event,organisationSlug)
            if created_event is None:
                return {"statusCode": 400, "body": json.dumps({"message": "Event with this name already exists."})}

            return {"statusCode": 201, "body": json.dumps({"message": "Event created successfully.", "event": created_event}, cls=DecimalEncoder)}

        elif http_method == "GET":
            events = get_events(organisationSlug)
            if events is None:
                return {"statusCode": 404, "body": json.dumps({"message": "No Events found."})}
            return {"statusCode": 200, "body": json.dumps(events, cls=DecimalEncoder)}

        elif http_method == "PUT":
            return {"statusCode": 405, "body": json.dumps({"message": "Method not implemented."}, cls=DecimalEncoder)}
        
        else:
            return {"statusCode": 405, "body": json.dumps({"message": "Method not allowed."})}

    except ValueError as e:
        logger.error("Validation error: %s", str(e))
        logger.error(traceback.format_exc())
        return {"statusCode": 400, "body": json.dumps({"message": "Validation error.", "error": str(e)})}
    except Exception as e:
        logger.error("Unexpected error: %s", str(e))
        logger.error(traceback.format_exc())
        return {"statusCode": 500, "body": json.dumps({"message": "Internal server error.", "error": str(e)})}