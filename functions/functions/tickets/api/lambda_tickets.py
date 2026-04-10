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

## custom scripts
sys.path.append(os.path.dirname(__file__))
from _shared.parser import parse_event
from _shared.DecimalEncoder import DecimalEncoder
from _shared.helpers import make_response
from _pydantic.EventBridge import trigger_eventbridge_event, EventType, Action
from _pydantic.models.tickets_models import TicketListResponse, SendTicketEmailRequest, BulkImportTicketsRequest
from _pydantic.models.models_extended import TicketModel, EventModel
from functions.tickets.shared.shared_tickets import create_email_job, get_single_ticket as _get_single_ticket, _build_ticket_name, get_single_event as _get_single_event, build_ticket_creation_key, get_ticket_request_record

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

def _build_bulk_import_ticket(ticket_data: dict, organisation_slug: str, event_id: str, index: int) -> dict:
    line_items = ticket_data.get("line_items", [])
    ticket_creation_key = build_ticket_creation_key(
        ticket_data=ticket_data,
        organisation_slug=organisation_slug,
        event_ksuid=event_id,
        fallback_prefix="bulk_import",
        index=index,
    )

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

def _line_item_lookup(event_model: EventModel | None) -> dict[str, dict]:
    line_item_lookup = {}

    if not event_model:
        return line_item_lookup

    for item in getattr(event_model, "items", []) or []:
        line_item_lookup[item.ksuid] = {
            "ksuid": item.ksuid,
            "entity_type": getattr(item, "entity_type", "ITEM"),
            "name": item.name,
            "status": getattr(item, "status", None),
        }

    for bundle in getattr(event_model, "bundles", []) or []:
        line_item_lookup[bundle.ksuid] = {
            "ksuid": bundle.ksuid,
            "entity_type": getattr(bundle, "entity_type", "BUNDLE"),
            "name": bundle.name,
            "status": getattr(bundle, "status", None),
        }

    return line_item_lookup
    
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
                send_reason="ticket_email_resend",
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
    # 1. Prepare each potential import ticket payload with creation key for future idempotency
    #   - If not preview, push events to eventbridge 
    # 2. Check the event exists
    # 3. Check that each ticket references valid line items for this event
    # 4. Check for duplicates based on idempotency key
    # 5. Check for potential duplicates based on customer email, name on ticket
    # 6. Return preview
    
    TABLE_NAME = ORG_TABLE_NAME_TEMPLATE.replace("org_name", organisationSlug)
    table = db.Table(TABLE_NAME)
    logger.info(f"Bulk ticket import request received for {organisationSlug}:{eventId} with preview={request_data.preview}")

    current_time = datetime.now(timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z')

    ## 1. 

    ticket_requests = [
        _build_bulk_import_ticket(ticket.model_dump(mode="json"), organisationSlug, eventId, index)
        for index, ticket in enumerate(request_data.tickets)
    ]

    # Send tickets if not preview mode
    if not request_data.preview:
        requested_tickets = []
        failed_tickets = []

        for payload in ticket_requests:
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
    
    ## 2. 
    event_data = _get_single_event(organisationSlug, eventId, table)[0]

    if not event_data:
        return make_response(404, {
            "message": "Event not found.",
            "preview": True,
            "event_id": eventId,
        })
    
    ## 3. 
    available_line_items = _line_item_lookup(event_data)
    existing_tickets = get_tickets(organisationSlug, eventId, actor="bulk_import_preview") or []
    analysed_tickets = []

    for index, ticket_request in enumerate(ticket_requests):
        issues = []
        duplicate = False
        potential_duplicate = False

        for line_item in ticket_request.get("line_items", []):
            if line_item.get('ksuid') not in available_line_items:
                issues.append({
                    "type": "missing_line_item",
                    "message": "The referenced line item does not exist on this event.",
                    "line_item": line_item,
                })

        # 4.
        idempotency_record = get_ticket_request_record(table, ticket_request["ticket_creation_key"])
        if idempotency_record:
            duplicate = True
            issues.append({
                "type": "existing_ticket_creation_key",
                "message": "A ticket creation request already exists for this ticket_creation_key.",
                "ticket_creation_key": ticket_request["ticket_creation_key"],
            })
        
        # 5. 
        for existing_ticket in existing_tickets:
            existing_email = (existing_ticket.customer_email or "").strip().lower()
            existing_name_on_ticket = (existing_ticket.name_on_ticket or "").strip().lower()

            if ticket_request.get("customer_email") == existing_email and ticket_request.get("name_on_ticket") == existing_name_on_ticket:
                duplicate = True
                issues.append({
                    "type": "exact_existing_ticket_match",
                    "message": "An existing ticket already matches this customer email and name.",
                    "existing_ticket": existing_ticket.model_dump(mode="json", exclude_none=True),
                })
                continue

            if ticket_request.get("customer_email") == existing_email:
                potential_duplicate = True
                issues.append({
                    "type": "matching_customer_email",
                    "message": "An existing ticket has the same customer email.",
                    "existing_ticket": existing_ticket.model_dump(mode="json", exclude_none=True)
                })

            if ticket_request.get("name_on_ticket") == existing_name_on_ticket:
                potential_duplicate = True
                issues.append({
                    "type": "matching_name_on_ticket",
                    "message": "An existing ticket has the same name on ticket.",
                    "existing_ticket": existing_ticket.model_dump(mode="json", exclude_none=True)
                })

        analysed_tickets.append({
            "index": index,
            "ticket": ticket_request,
            "issues": issues,
            "duplicate": duplicate,
            "potential_duplicate": potential_duplicate,
        })

    logger.info(f"Returning bulk ticket import preview for {organisationSlug}:{eventId} with {len(analysed_tickets)} analysed tickets")
    logger.info(f"Analysed tickets: {analysed_tickets}")
    logger.info(f"Analysed tickets: {json.dumps(analysed_tickets, indent=2, cls=DecimalEncoder)}")
    return make_response(200, {
        "preview": request_data.preview,
        "event": event_data.model_dump(mode="json", exclude_none=True),
        "tickets": analysed_tickets,
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
