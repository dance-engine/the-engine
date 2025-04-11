import json
import logging
import os
import traceback
from datetime import datetime, timezone

import boto3
from boto3.dynamodb.conditions import Key
from botocore.exceptions import ClientError
from ksuid import KsuidMs

from _shared.parser import parse_event, validate_event
from _shared.DecimalEncoder import DecimalEncoder
from _shared.naming import getOrganisationTableName
from _shared.EventBridge import triggerEBEvent


logger = logging.getLogger()
logger.setLevel("INFO")

db = boto3.resource("dynamodb")
ORG_TABLE_NAME_TEMPLATE = os.environ.get("ORG_TABLE_NAME_TEMPLATE")
eventbridge = boto3.client('events')

def create_customer(event_data,organisationSlug):
    """
    Creates a new Customer
    """

    logger.info(f"Create Customer: {event_data}")
    TABLE_NAME = ORG_TABLE_NAME_TEMPLATE.replace("org_name",organisationSlug)
    table = db.Table(TABLE_NAME)
    logger.info(f"Adding event for {organisationSlug} into {TABLE_NAME}")

    clientKsuid = KsuidMs.from_base62(event_data.get('ksuid'))
    current_time = datetime.now(timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z')

    logger.info(f"Current Time: {current_time}")

    customer_item = {
        "ksuid":            f"{clientKsuid}",
        "name":             event_data.get('name'),
        "email":             event_data.get('email'),
        "phone":             event_data.get('phone'),
        "bio":              event_data.get("bio"),
        "organisation":     organisationSlug,
        "entity_type":      "CUSTOMER",
        "created_at":       current_time,
        "updated_at":       current_time,
        "version":          event_data.get("version"),
    }
    try:
        event_response = upsert_customer(table,clientKsuid,customer_item, ["created_at"])

    except ClientError as e:
        if e.response['Error']['Code'] == 'ConditionalCheckFailedException':
            logger.error(f"Item already exists! {customer_item}")
        else:
            raise
    return customer_item, event_response

def upsert_customer(table, ksuid: str, item: dict, only_set_once: list = []):
    update_parts = []
    expression_attr_names = {}
    expression_attr_values = {}

    incoming_version = item.get("version") if isinstance(item.get("version"), int) else 0
    item["version"] = incoming_version + 1

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

    # Only update if existing version is less than the one being replaced
    condition_expression = "attribute_not_exists(#version) OR #version <= :incoming_version"
    expression_attr_names["#version"] = "version"
    expression_attr_values[":incoming_version"] = incoming_version

    try:
        response = table.update_item(
            Key={"PK": f"CUSTOMER#{ksuid}", "SK": f"CUSTOMER#{ksuid}"},
            UpdateExpression=update_expression,
            ConditionExpression=condition_expression,
            ExpressionAttributeNames=expression_attr_names,
            ExpressionAttributeValues=expression_attr_values,
            ReturnValues="ALL_NEW"
        )
        triggerEBEvent(eventbridge,"events", "UpsertEvent", response)
        return response
    except table.meta.client.exceptions.ConditionalCheckFailedException:
        # Handle conflict (incoming version is too old)
        return {
            "error": "Version conflict",
            "reason": f"Incoming version ({incoming_version}) is not newer."
        }


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

def get_single_customer(organisationSlug,customerId):
    TABLE_NAME = ORG_TABLE_NAME_TEMPLATE.replace("org_name",organisationSlug)
    table = db.Table(TABLE_NAME)
    logger.info(f"Getting customer {customerId} for {organisationSlug} from {TABLE_NAME} / ")

    # response = table.get_item(
    #     Key={ 'PK': f'EVENT#{eventId}', 'SK': f'EVENT#{eventId}'}
    # )
    response = table.query(
        IndexName='IDXinv',  # Replace with your actual index name
        KeyConditionExpression=Key('SK').eq(f'CUSTOMER#{customerId}')
    )
    event_related_items = response.get("Items", None)
    if not event_related_items:
        logger.info(f"Event not found {event_related_items}")
        return []
    else: 
        logger.info(f"Event Related Response {event_related_items}")
        event_item = event_related_items[0] #! BAd Code! need to think about how much checking is needed
        # event = response.get("Items", {})
    return event_item


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

            return {"statusCode": 201, "headers": { "Content-Type": "application/json" }, "body": json.dumps({"message": "Event created successfully.", "event": created_customer}, cls=DecimalEncoder)}

        elif http_method == "GET":
            logger.info(f"{organisationSlug}:{customerId}")
            customers = [get_single_customer(organisationSlug,customerId)] if customerId else get_customers(organisationSlug)
            if customers is None:
                return {"statusCode": 404, "headers": { "Content-Type": "application/json", "Allow-Origin": "*" }, "body": json.dumps({"message": "No customers found."})}
            return {"statusCode": 200, "headers": { "Content-Type": "application/json" }, "body": json.dumps(customers, cls=DecimalEncoder)}

        elif http_method == "PUT":
            return {"statusCode": 405, "headers": { "Content-Type": "application/json", "Allow-Origin": "*" }, "body": json.dumps({"message": "Method not implemented."}, cls=DecimalEncoder)}
        
        else:
            return {"statusCode": 405, "headers": { "Content-Type": "application/json", "Allow-Origin": "*"}, "body": json.dumps({"message": "Method not allowed."})}

    except ValueError as e:
        logger.error("Validation error: %s", str(e))
        logger.error(traceback.format_exc())
        return {"statusCode": 400, "body": json.dumps({"message": "Validation error.", "error": str(e)})}
    except Exception as e:
        logger.error("Unexpected error: %s", str(e))
        logger.error(traceback.format_exc())
        return {"statusCode": 500, "body": json.dumps({"message": "Internal server error.", "error": str(e)})}