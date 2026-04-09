## python libraries
import os
import json
import boto3 # not a python library but is included in lambda without need to install it
import logging
import traceback
import sys
import hashlib
from datetime import datetime, timezone

## installed packages
from pydantic import ValidationError # layer: pydantic
from boto3.dynamodb.conditions import Key
from botocore.exceptions import ClientError

## custom scripts
sys.path.append(os.path.dirname(__file__))
from _shared.parser import parse_event
from _shared.DecimalEncoder import DecimalEncoder
from _shared.helpers import make_response
from _pydantic.EventBridge import trigger_eventbridge_event, EventType, Action
from _pydantic.models.tickets_models import TicketListResponse, SendTicketEmailRequest, BulkImportTicketsRequest
from _pydantic.models.models_extended import TicketModel
from functions.tickets.shared.shared_tickets import create_email_job, get_single_ticket as _get_single_ticket, _build_ticket_name

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

def _build_bulk_import_ticket_creation_key(ticket_data: dict, organisation_slug: str, event_id: str, index: int) -> str:
    explicit_key = ticket_data.get("ticket_creation_key")
    if explicit_key:
        return str(explicit_key)

    fallback = json.dumps(
        {
            "organisation": organisation_slug,
            "event_ksuid": event_id,
            "index": index,
            "customer_email": ticket_data.get("customer_email"),
            "name_on_ticket": ticket_data.get("name_on_ticket"),
            "line_items": ticket_data.get("line_items", []),
        },
        sort_keys=True,
        separators=(",", ":"),
    )
    return f"bulk_import:{hashlib.sha256(fallback.encode('utf-8')).hexdigest()}"

def _build_bulk_import_ticket_payload(ticket_data: dict, organisation_slug: str, event_id: str, index: int) -> dict:
    line_items = ticket_data.get("line_items", [])
    ticket_creation_key = _build_bulk_import_ticket_creation_key(ticket_data, organisation_slug, event_id, index)

    return {
        "ticket_creation_key": ticket_creation_key,
        "event_ksuid": event_id,
        "customer_email": ticket_data.get("customer_email"),
        "name_on_ticket": ticket_data.get("name_on_ticket"),
        "line_items": line_items,
        "source_sale_type": "bulk_import",
        "payment_provider": None,
        "payment_reference": None,
        "ticket_name_preview": _build_ticket_name(line_items),
    }
    
def get_single_ticket(organisationSlug: str,  eventId: str,  ticketId: str, public: bool = False, actor: str = "unknown"):
    TABLE_NAME = ORG_TABLE_NAME_TEMPLATE.replace("org_name", organisationSlug)
    table = db.Table(TABLE_NAME)
    logger.info(f"Getting ticket for {eventId} of {organisationSlug} from {TABLE_NAME}")

    return _get_single_ticket(table, organisationSlug, eventId, ticketId, public, actor)

def get_tickets(organisationSlug: str,  eventId: str, public: bool = False, actor: str = "unknown"):
    TABLE_NAME = ORG_TABLE_NAME_TEMPLATE.replace("org_name",organisationSlug)
    table = db.Table(TABLE_NAME)
    logger.info(f"Getting Tickets for {eventId} of {organisationSlug} from {TABLE_NAME}")
    blank_model = TicketModel(ksuid="blank", parent_event_ksuid=eventId, name="blank", organisation=organisationSlug, name_on_ticket="blank", customer_email="blank", email="blank", includes=[])

    try:
        tickets = blank_model.query_gsi(
            table=table,
            index_name="gsi1",
            key_condition=Key("gsi1PK").eq(blank_model.gsi1PK) & Key("gsi1SK").begins_with(f"{blank_model.gsi1SK.split('#')[0]}#"),
        )
        logger.info(f"Found tickets for {eventId} of {organisationSlug}: {tickets}")
    except Exception as e:
        logger.error(f"DynamoDB query failed to get tickets for {organisationSlug}: {e}")
        raise Exception
    
    #! temporary fix this needs review
    if isinstance(tickets, TicketModel):
        tickets = [tickets]    

    return tickets

def send_tickets(request_data: SendTicketEmailRequest, organisationSlug: str, eventId: str, actor: str = "unknown"):
    TABLE_NAME = ORG_TABLE_NAME_TEMPLATE.replace("org_name", organisationSlug)
    table = db.Table(TABLE_NAME)
    logger.info(f"Request to resend tickets for {organisationSlug}:{eventId} from {TABLE_NAME}")

    ticket_ids = request_data.tickets or []
    if len(ticket_ids) == 0:
        return make_response(400, {"message": "No tickets provided."})

    current_time = datetime.now(timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z')
    missing_tickets = []
    failed_tickets = []
    queued_tickets = []

    for ticket_id in ticket_ids:
        ticket = get_single_ticket(organisationSlug, eventId, ticket_id, actor=actor)

        if ticket is None:
            missing_tickets.append(ticket_id)
            continue

        try:
            email_job = create_email_job(
                table,
                ticket,
                organisationSlug,
                f"resend:{ticket.ksuid}:{current_time}",
                actor,
            )

            queued = trigger_eventbridge_event(
                eventbridge,
                source="dance-engine.core" if not STAGE_NAME == "preview" else "dance-engine.core.preview",
                resource_type=EventType.ticket,
                action=Action.updated,
                organisation=organisationSlug,
                resource_id=ticket.PK,
                data={
                    "ticket": ticket.model_dump(mode="json"),
                    "notifications": {
                        "email_job": email_job.model_dump(mode="json")
                    },
                },
                meta={
                    "accountId": actor,
                    "reason": "ticket_email_resend",
                },
            )

            if not queued:
                failed_tickets.append(ticket_id)
                continue

            queued_tickets.append(ticket_id)
        except Exception as e:
            logger.error("Failed to queue resend for ticket %s: %s", ticket_id, str(e))
            logger.error(traceback.format_exc())
            failed_tickets.append(ticket_id)

    if missing_tickets and not queued_tickets and not failed_tickets:
        return make_response(404, {
            "message": "Ticket(s) not found.",
            "missing_tickets": missing_tickets
        })

    if failed_tickets and not queued_tickets:
        return make_response(500, {
            "message": "Failed to queue ticket email resend.",
            "failed_tickets": failed_tickets,
            "missing_tickets": missing_tickets
        })

    return make_response(201, {
        "message": "Ticket send requested successfully.",
        "requested_tickets": queued_tickets,
        "failed_tickets": failed_tickets,
        "missing_tickets": missing_tickets
    })

def import_tickets(request_data: BulkImportTicketsRequest, organisationSlug: str, eventId: str, actor: str = "unknown"):
    current_time = datetime.now(timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z')
    ticket_payloads = [
        _build_bulk_import_ticket_payload(ticket.model_dump(mode="json"), organisationSlug, eventId, index)
        for index, ticket in enumerate(request_data.tickets)
    ]

    if request_data.preview:
        return make_response(200, {
            "preview": True,
            "tickets": ticket_payloads,
        })

    requested_tickets = []
    failed_tickets = []

    for payload in ticket_payloads:
        queued = trigger_eventbridge_event(
            eventbridge,
            source="dance-engine.core" if not STAGE_NAME == "preview" else "dance-engine.core.preview",
            resource_type=EventType.ticket,
            action=Action.requested,
            organisation=organisationSlug,
            resource_id=payload["ticket_creation_key"],
            data=payload,
            meta={
                "accountId": actor,
                "requested_at": current_time,
            },
        )

        if queued:
            requested_tickets.append(payload["ticket_creation_key"])
        else:
            failed_tickets.append(payload["ticket_creation_key"])

    if failed_tickets and not requested_tickets:
        return make_response(500, {
            "message": "Failed to request ticket import.",
            "failed_tickets": failed_tickets,
        })

    return make_response(201, {
        "message": "Ticket import requested successfully.",
        "requested_tickets": requested_tickets,
        "failed_tickets": failed_tickets,
    })

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
        raw_path         = event.get("rawPath", "")

        if http_method == "GET":
            logger.info(f"{organisationSlug}:{eventId}:{ticketId} - Getting ticket(s)")
            response_cls = TicketListResponse

            tickets = [get_single_ticket(organisationSlug, eventId, ticketId, is_public, actor)] if ticketId else get_tickets(organisationSlug, eventId, is_public, actor)
            if tickets is None:
                return make_response(404, {"message": "Ticket(s) not found."})
            
            resposne = response_cls(tickets=tickets)
            return make_response(200, resposne.model_dump(mode="json", exclude_none=True))
        elif http_method == "POST":
            if raw_path.endswith("/tickets/send"):
                validated_request = SendTicketEmailRequest(**parsed_event)
                return send_tickets(validated_request, organisationSlug, eventId, actor)
            if raw_path.endswith("/tickets/import"):
                validated_request = BulkImportTicketsRequest(**parsed_event)
                return import_tickets(validated_request, organisationSlug, eventId, actor)
            return make_response(404, {"message": "Unknown tickets action."})
        else:
            return make_response(405, {"message": "Method not allowed."})
    else:
        # no longer process events from eventbridge
        logger.info("Triggered by EventBridge")
        return make_response(400, {"message": "EventBridge events are no longer processed by this lambda."})
