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
from ksuid import KsuidMs # layer: utils
from boto3.dynamodb.conditions import Key
import jwt

## custom scripts
sys.path.append(os.path.dirname(__file__))
from _shared.parser import parse_event
from _shared.DecimalEncoder import DecimalEncoder
from _shared.helpers import make_response
from _pydantic.models.models_extended import TicketModel, TicketChildModel, CustomerModel, TicketCreationIdempotencyModel
from _pydantic.EventBridge import trigger_eventbridge_event, EventType, Action, EventBridgeEvent, EventBridgeEventDetail # pydantic layer
from _pydantic.dynamodb import transact_upsert # pydantic layer
from functions.tickets.shared.shared_tickets import create_email_job, get_single_ticket, _build_ticket_name, _normalise_entity_type, build_ticket_creation_key, get_ticket_request_record

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
# TICKET_QR_AUDIENCE = os.environ.get('TICKET_QR_AUDIENCE') or (_ for _ in ()).throw(KeyError("Environment variable 'TICKET_QR_AUDIENCE' not found"))
TICKET_QR_JWT_SECRET = os.environ.get('TICKET_QR_JWT_SECRET') or (_ for _ in ()).throw(KeyError("Environment variable 'TICKET_QR_JWT_SECRET' not found"))

def mint_qr_token(ticket) -> str:
    iat = int(datetime.now(timezone.utc).timestamp())

    payload = {
        "v": 1,
        "iss": "DANCEENGINE",
        "sub": ticket.ksuid,
        "aud": "1",#TICKET_QR_AUDIENCE,
        "o": ticket.organisation,
        "e": ticket.parent_event_ksuid,
        "jti": str(KsuidMs()),
        "iat": iat,
    }

    return jwt.encode(payload, TICKET_QR_JWT_SECRET, algorithm="HS256")

def get_existing_ticket_for_request(table, idempotency_key: str, organisation_slug: str, event_ksuid: str):
    ticket_request = get_ticket_request_record(table, idempotency_key)
    if ticket_request is None:
        return None, None

    ticket = get_single_ticket(table, organisation_slug, event_ksuid, ticket_request.ticket_ksuid)
    return ticket_request, ticket

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
    idempotency_key = build_ticket_creation_key(
        ticket_data=data,
        organisation_slug=event_detail.organisation,
        event_ksuid=data.get("event_ksuid"),
        meta=event_detail.meta,
        resource_type=event_detail.resource_type.value if event_detail.resource_type else None,
        action=event_detail.action.value if event_detail.action else None,
        resource_id=event_detail.resource_id,
    )
    logger.info(f"Ticket creation idempotency key: {idempotency_key}")

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
                "child_type": it.get("entity_type"),
                "parent_ticket_ksuid": ticket_ksuid,
                "organisation": organisation_slug,
                "created_at": current_time,
                "updated_at": current_time,
                "name": it.get("name"),
                "includes": it.get("includes", []) if _normalise_entity_type(it.get("entity_type")) == "bundle" else []
            }) for it in data.get("line_items", [])
        ]

        ticket_includes = [f"{it.PK}" for it in child_items]

        ticket_name = _build_ticket_name(data.get("line_items", []))

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
        
        ticket_model.qr_token = mint_qr_token(ticket_model)

        ticket_creation_idempotency_model = TicketCreationIdempotencyModel.model_validate({
            "idempotency_key": idempotency_key,
            "organisation": organisation_slug,
            "parent_event_ksuid": data.get("event_ksuid"),
            "ticket_ksuid": ticket_ksuid,
            "source_resource_type": event_detail.resource_type.value if event_detail.resource_type else None,
            "source_resource_id": event_detail.resource_id,
            "created_at": current_time,
            "updated_at": current_time,
        })

        customer_model = CustomerModel.model_validate({
            "ksuid": str(KsuidMs()),
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
                                 items = [ticket_creation_idempotency_model] + child_items + [ticket_model],
                                 only_set_once=["created_at", "ksuid"],
                                 condition_expression="attribute_not_exists(PK)")
        
        #! Temporary fix. See issue #77
        customer_result = transact_upsert(table=table, 
                                         items = [customer_model],
                                         only_set_once=["created_at", "email", "ksuid"],
                                         condition_expression="attribute_not_exists(PK)")
        result.failed.extend(customer_result.failed)
        
        logger.info(f"Transact upsert result: {result}")

        if result.failed and ticket_creation_idempotency_model in result.failed:
            logger.info(f"Ticket create request already processed for key {idempotency_key}, returning existing ticket {ticket_ksuid}")
            existing_request, existing_ticket = get_existing_ticket_for_request(table, idempotency_key, organisation_slug, data.get("event_ksuid"))            
            return make_response(200, {
                "message": "Ticket already created for this request.",
                "ticket": existing_ticket.model_dump(mode="json"),
                "idempotency_key": idempotency_key,
            })


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
                                  source="dance-engine.core" if not STAGE_NAME == "preview" else "dance-engine.core.preview", 
                                  resource_type=EventType.ticket,
                                  action=Action.created,
                                  organisation=organisation_slug,
                                  resource_id=ticket_model.PK,
                                  data={
                                      "ticket": ticket_model.model_dump(mode="json"), 
                                      "child_items": [ci.model_dump(mode="json") for ci in child_items],
                                      "notifications": {
                                            "email_job": create_email_job(table, ticket_model, organisation_slug, data.get("session_id"), actor)
                                      }},
                                  meta={"accountId":actor})
        
        if customer_model in result.successful:
            trigger_eventbridge_event(eventbridge, 
                                    source="dance-engine.core" if not STAGE_NAME == "preview" else "dance-engine.core.preview", 
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
    
def lambda_handler(event, context):
    logger.info("Received event: %s", json.dumps(event, indent=2, cls=DecimalEncoder))

    if event.get("Records") and event.get("Records", [])[0].get("eventSource") == "aws:sqs":
        logger.info("Triggered by SQS")
        batch_failures = []

        for record in event.get("Records", []):
            try:
                parsed_message = parse_event(record.get("body"))
                type = parsed_message.get("detail-type")
                organisationSlug = parsed_message.get("detail", {}).get("organisation")

                if type in ("checkout.completed", "ticket.requested"):
                    logger.info("Handling %s event.", type)
                    validated_request = EventBridgeEvent(**parsed_message)
                    response = create_ticket(validated_request, organisationSlug)
                    status_code = response.get("statusCode", 500)
                    if status_code >= 500:
                        batch_failures.append({"itemIdentifier": record.get("messageId")})
                else:
                    logger.warning(f"Received event type I can not currently process: {type}")
            except Exception:
                logger.error("Failed processing SQS record\n%s", traceback.format_exc())
                batch_failures.append({"itemIdentifier": record.get("messageId")})

        return {"batchItemFailures": batch_failures}
