import json
import logging
import os
import traceback

import boto3
from boto3.dynamodb.conditions import Key
from botocore.exceptions import ClientError
from ksuid import KsuidMs

from _shared.parser import parse_event, validate_event
from _shared.DecimalEncoder import DecimalEncoder
from _shared.naming import getOrganisationTableName

logger = logging.getLogger()
logger.setLevel("INFO")

db = boto3.resource("dynamodb")
ORG_TABLE_NAME_TEMPLATE = os.environ.get("ORG_TABLE_NAME_TEMPLATE")
eventbridge = boto3.client('events')

def create_customer(event_data,organisationSlug):
    """
    # TODO implement
    Checke for KSUID and create if needed
    Validate Input 
    Store objects in a tranactionalized dynamoDB call
    Return if it worked or not"
    """

    logger.info(f"Create Customer: {event_data}")
    TABLE_NAME = ORG_TABLE_NAME_TEMPLATE.replace("org_name",organisationSlug)
    table = db.Table(TABLE_NAME)
    logger.info(f"Adding event for {organisationSlug} into {TABLE_NAME}")

    clientKsuid = KsuidMs.from_base62(event_data.get('ksuid'))
    location_ksuid = event_data.get("location",{}).get("ksuid",KsuidMs())
    location_data = event_data.get('location')
    current_time = datetime.now(timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z')

    logger.info(f"Current Time: {current_time}")

    event_item = {
        "ksuid":            f"{clientKsuid}",
        "banner":           event_data.get("banner"),
        "event_slug":       f"{generate_slug(event_data.get('name'))}",
        "organisation":     organisationSlug,
        "entity_type":      "EVENT",
        "name":             event_data.get('name'),
        "starts_at":        event_data.get("starts_at"),
        "ends_at":          event_data.get("ends_at"),
        "category":         ", ".join(str(cat) for cat in event_data.get("category")),
        "capacity":         event_data.get("capacity"),
        "number_sold":      0,
        "description":      event_data.get("description"),
        "created_at":       current_time,
        "updated_at":       current_time,
        "version":          event_data.get("version"),
        "gsi1PK":           f"EVENTLIST#{organisationSlug}",
        "gsi1SK":           f"EVENT#{clientKsuid}"    
    }
    
    location_item = {
        "ksuid":            f"{location_ksuid}",
        "organisation":         organisationSlug,
        "entity_type":      "LOCATION",
        "name":             location_data.get('name'),
        "address":          location_data.get('address'),
        "lat":              location_data.get('lat'),
        "lng":              location_data.get('lng'),
        "created_at":       current_time,
        "updated_at":       current_time,
        "gsi1PK":           f"EVENTLIST#{organisationSlug}",
        "gsi1SK":           f"LOCATION#{location_ksuid}"
    }
    

    try:
        event_response = upsert_event(table,clientKsuid,event_item, ["event_slug","created_at"])
        location_response = upsert_location(table,location_ksuid, f"EVENT#{clientKsuid}", location_item, ["event_slug","created_at"])

    except ClientError as e:
        if e.response['Error']['Code'] == 'ConditionalCheckFailedException':
            logger.error(f"Item already exists! {event_item}")
        else:
            raise
    return event_item, event_response, location_response

def get_customers(organisationSlug):
    TABLE_NAME = ORG_TABLE_NAME_TEMPLATE.replace("org_name",organisationSlug)
    table = db.Table(TABLE_NAME)
    logger.info(f"Getting events for {organisationSlug} from {TABLE_NAME}")

    response = table.query(
                IndexName="typeIDX",
                KeyConditionExpression=Key("entity_type").eq(f"CUSTOMER") & Key("PK").begins_with("CUSTOMER#"),
                ScanIndexForward=True
            )
    events = response.get("Items", [])
    return events

def private_handler(event, context):
    try:
        logger.info("Received event: %s", json.dumps(event, indent=2, cls=DecimalEncoder))
        parsed_event = parse_event(event)
        http_method = event['requestContext']["http"]["method"]
        organisationSlug = event.get("pathParameters", {}).get("organisation")
        customerId = event.get("pathParameters", {}).get("ksuid",None)


        if http_method == "POST":
            validated_event = validate_event(parsed_event, ["name"])

            created_customer = create_customer(validated_event,organisationSlug)
            if created_customer is None:
                return { "statusCode": 400, "headers": { "Content-Type": "application/json" }, "body": json.dumps({"message": "Customer with this name already exists."})}

            return {"statusCode": 201, "headers": { "Content-Type": "application/json" }, "body": json.dumps({"message": "Event created successfully.", "event": created_event}, cls=DecimalEncoder)}

        elif http_method == "GET":
            logger.info(f"{organisationSlug}:{customerId}")
            customers = [get_customers(organisationSlug,customerId)] if customerId else get_customers(organisationSlug)
            if customers is None:
                return {"statusCode": 404, "headers": { "Content-Type": "application/json" }, "body": json.dumps({"message": "No customers found."})}
            return {"statusCode": 200, "headers": { "Content-Type": "application/json" }, "body": json.dumps(customers, cls=DecimalEncoder)}

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