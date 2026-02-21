## python libraries
import os
import json
import boto3 # not a python library but is included in lambda without need to install it
import logging
import traceback
import sys
from datetime import datetime, timezone

## installed packages
from pydantic import ValidationError # layer: pydantic
from boto3.dynamodb.conditions import Key
from botocore.exceptions import ClientError
from ksuid import KsuidMs # layer: utils

## custom scripts
sys.path.append(os.path.dirname(__file__))
from _shared.parser import parse_event
from _shared.DecimalEncoder import DecimalEncoder
from _shared.helpers import make_response
from _pydantic.models.tickets_models import TicketListResponse
from _pydantic.models.models_extended import TicketModel, TicketChildModel, CustomerModel
from _pydantic.EventBridge import trigger_eventbridge_event, EventType, Action, EventBridgeEvent # pydantic layer
from _pydantic.dynamodb import transact_upsert # pydantic layer

## logger setup
logger = logging.getLogger()
logger.setLevel("INFO")

## aws resources an clients
db = boto3.resource("dynamodb")
eventbridge = boto3.client('events')

## ENV variables
# will throw an error if the env variable does not exist
STAGE_NAME = os.environ.get('STAGE_NAME') or (_ for _ in ()).throw(KeyError("Environment variable 'STAGE_NAME' not found"))
ORG_TABLE_NAME_TEMPLATE = os.environ.get('ORG_TABLE_NAME_TEMPLATE') or (_ for _ in ()).throw(KeyError("Environment variable 'ORG_TABLE_NAME_TEMPLATE' not found"))

from _pydantic.EventBridge import EventBridgeEventDetail  # Ensure this import is present

def create_ticket(request_data: EventBridgeEvent, organisation_slug: str, actor: str = "unknown"):
    logger.info(f"Creating ticket: {request_data}")
    event_detail: EventBridgeEventDetail = request_data.detail
    data = event_detail.data

    logger.info(f"Parsed event detail: {json.dumps(event_detail.model_dump(mode='json'), indent=2)}")
    logger.info(f"Parsed data: {json.dumps(data, indent=2)}")

    TABLE_NAME = ORG_TABLE_NAME_TEMPLATE.replace("org_name", organisation_slug)
    table = db.Table(TABLE_NAME)
    logger.info(f"Creating ticket for {data.get('event_ksuid')}, {organisation_slug} into {TABLE_NAME}")    

    current_time = datetime.now(timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z')
    logger.info(f"Current Time: {current_time}")

    # What information is in the meta?
    # Where am I getting all of the ticket info from?
    # Do I need to get anything from Stripe to get the info?
    # The meta should probably have all that is needed:
    #     - parent_event_ksuid
    #     - customer_email
    #     - name_on_ticket
    #     - name
    #     - includes
    # How will I generate the child items from this info?
    # Do I need to jsut use the line_items from the Stripe checkout session stored in the meta?

    ticket_ksuid = str(KsuidMs())
    
    try:

        # build child items from line_items
        child_items = [
            TicketChildModel.model_validate({
                "child_ksuid":it.get("ksuid"),
                "child_type": it.get("type"),
                "parent_ticket_ksuid": ticket_ksuid,
                "organisation": organisation_slug,
                "created_at": current_time,
                "updated_at": current_time,
                "name": it.get("name"),
                "includes": it.get("includes", []) if it.get("type") == "bundle" else []
            }) for it in data.get("line_items", [])
        ]

        ticket_includes = [f"{it.PK}" for it in child_items]

        ticket_name = ""
        bundle_names = [it.get("name") for it in data.get("line_items", []) if it.get("type") == "bundle"]
        item_names = [it.get("name") for it in data.get("line_items", []) if it.get("type") == "item"]

        if bundle_names:
            ticket_name = " and ".join(bundle_names) + " with " + ", ".join(item_names) if item_names else " and ".join(bundle_names)
        else:
            ticket_name = ", ".join(item_names)

        logger.info(f"Determined ticket name: {ticket_name}")

        ticket_model = TicketModel.model_validate({
            "ksuid": ticket_ksuid,
            "organisation": organisation_slug,
            "parent_event_ksuid": data.get("event_ksuid"),
            "created_at": current_time,
            "updated_at": current_time,
            "customer_email": data.get("customer_email"),
            "name_on_ticket": data.get("name_on_ticket"),
            "name": ticket_name,
            "includes": ticket_includes
            })

        customer_model = CustomerModel.model_validate({
            "email": data.get("customer_email"),
            "name": data.get("name_on_ticket"),
            "organisation": organisation_slug,
            "created_at": current_time,
            "updated_at": current_time,
            "version": 0
        })
        
    except ValidationError as e:
        logger.error("Validation error: %s", str(e))
        logger.error(traceback.format_exc())
        return make_response(400, {
            "message": "Invalid update request",
            "error": str(e)
        })        
    
    try:
        result = transact_upsert(table=table, 
                                 items = child_items + [ticket_model, customer_model],
                                 only_set_once=["created_at", "ksuid"],
                                 condition_expression="attribute_not_exists(PK)")

        if result.failed and not result.successful and len(result.failed) > 0:
            return make_response(400, {
                "message": "Failed to create a ticket.",
                "failed_bundles": [
                    {
                        "items": item.model_dump(mode="json"),
                        "status": "failed",
                        "reason": f.inferred
                    } for item, f in zip(result.failed, result.failures)
                ]
            })

        if result.failed and result.successful and len(result.failed) > 0 and len(result.successful) > 0:
            if customer_model in result.failed:
                logger.info(f"Customer creation failed for {customer_model.email}")
            if customer_model in result.failed and len(result.failed) > 1:
                logger.info(f"Other items failed to create along with the customer: {[item.model_dump(mode='json') for item in result.failed if item != customer_model]}")

                return make_response(207, {
                    "message": "Partial success",
                    "successful": [
                        {
                            "bundle": item.model_dump(mode="json"),
                            "status": "Created successfully"
                        } for item in result.successful
                    ],
                    "failed": [
                        {
                            "item": item.model_dump(mode="json"),
                            "status": "failed",
                            "reason": f.inferred
                        } for item, f in zip(result.failed, result.failures)
                    ]
                })
        
        trigger_eventbridge_event(eventbridge, 
                                  source="dance-engine.core", 
                                  resource_type=EventType.ticket,
                                  action=Action.created,
                                  organisation=organisation_slug,
                                  resource_id=ticket_model.PK,
                                  data={
                                      "ticket": ticket_model.model_dump(mode="json"), 
                                      "child_items": [ci.model_dump(mode="json") for ci in child_items]},
                                  meta={"accountId":actor})
        
        if customer_model in result.successful:
            trigger_eventbridge_event(eventbridge, 
                                    source="dance-engine.core", 
                                    resource_type=EventType.customer,
                                    action=Action.created,
                                    organisation=organisation_slug,
                                    resource_id=customer_model.PK,
                                    data=customer_model.model_dump(mode="json"),
                                    meta={"accountId":actor})

        return make_response(201, {
            "message": "Ticket created successfully.",
            "ticket": [t.model_dump(mode="json") for t in result.successful],
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
    
def get_single_ticket(organisationSlug: str,  eventId: str,  ticketId: str, public: bool = False, actor: str = "unknown"):
    TABLE_NAME = ORG_TABLE_NAME_TEMPLATE.replace("org_name", organisationSlug)
    table = db.Table(TABLE_NAME)
    logger.info(f"Getting ticket for {eventId} of {organisationSlug} from {TABLE_NAME}")
    blank_model = TicketModel(ksuid=ticketId, parent_event_ksuid=eventId, name="blank", organisation=organisationSlug, name_on_ticket="blank", customer_email="blank", email="blank", includes=[])

    try:
        ticket = blank_model.query_gsi(
            index_name="gsi2",
            table=table, 
            key_condition=Key("gsi2PK").eq(f'{blank_model.gsi2PK}'), 
            assemble_entites=True
        )
        logger.info(f"Found ticket for {organisationSlug}: {ticket}")
    except ClientError as e:
        if e.response['Error']['Code'] == 'ResourceNotFoundException':
            logger.error(f"Ticket not found for {organisationSlug}: {e}")
            return None
        else:
            raise
    except ValueError as e:
        logger.error(f"Ticket not found for {organisationSlug}: {e}")
        return None
    
    except Exception as e:
        logger.error(f"DynamoDB query failed to get ticket for {organisationSlug}: {e}")
        raise Exception
    
    return ticket if ticket else None

def get_tickets(organisationSlug: str,  eventId: str, public: bool = False, actor: str = "unknown"):
    return make_response(501, {"message": "Not implemented yet."})

def lambda_handler(event, context):
    logger.info("Received event: %s", json.dumps(event, indent=2, cls=DecimalEncoder))

    http_method = event.get('requestContext', {}).get("http", {}).get("method")
    
    if http_method:
        logger.info("Triggered by API Gateway")
        parsed_event = parse_event(event)

        organisationSlug = event.get("pathParameters", {}).get("organisation")
        ticketId         = event.get("pathParameters", {}).get("ksuid")
        eventId          = event.get("pathParameters", {}).get("event")
        is_public        = event.get("rawPath", "").startswith("/public")
        actor            = event.get("requestContext", {}).get("accountId", "unknown")

        if http_method == "GET":
            logger.info(f"{organisationSlug}:{eventId}:{ticketId} - Getting ticket(s)")
            response_cls = TicketListResponse

            tickets = [get_single_ticket(organisationSlug, eventId, ticketId, is_public, actor)] if ticketId else get_tickets(organisationSlug, eventId, is_public, actor)
            if tickets is None:
                return make_response(404, {"message": "Ticket(s) not found."})
            
            resposne = response_cls(tickets=tickets)
            return make_response(200, resposne.model_dump(mode="json", exclude_none=True))        
    else:
        logger.info("Triggered by EventBridge")

        type = event.get("detail-type", {})
        organisationSlug = event.get("detail", {}).get("organisation", {})

        if type == "checkout.completed":
            logger.info("Handling checkout.completed event.")
            validated_request = EventBridgeEvent(**event)

            return create_ticket(validated_request, organisationSlug)
        else:
            logger.warning(f"Received event type I can not currently process: {type}")
            return make_response(400, {"message": f"Unhandled event type: {type}"})