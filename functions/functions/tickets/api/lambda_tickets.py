## python libraries
import os
import json
import boto3 # not a python library but is included in lambda without need to install it
import logging
import traceback
import sys
from datetime import datetime, timezone
import jwt

## installed packages
from pydantic import ValidationError # layer: pydantic
from boto3.dynamodb.conditions import Key
from botocore.exceptions import ClientError

## custom scripts
sys.path.append(os.path.dirname(__file__))
from _shared.parser import parse_event
from _shared.DecimalEncoder import DecimalEncoder
from _shared.helpers import make_response
from _pydantic.dynamodb import transact_upsert
from _pydantic.EventBridge import trigger_eventbridge_event, EventType, Action
from _pydantic.models.tickets_models import TicketListResponse, SendTicketEmailRequest, BulkImportTicketsRequest, UpdateTicketRequest, ValidateTicketJwtRequest, ValidateTicketJwtResponse, TicketAdmissionRequest, TicketStatus, AdmissionStatus
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
TICKET_QR_JWT_SECRET = os.environ.get('TICKET_QR_JWT_SECRET') or (_ for _ in ()).throw(KeyError("Environment variable 'TICKET_QR_JWT_SECRET' not found"))

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

def _update(request_data: UpdateTicketRequest, organisationSlug: str, eventId: str, actor: str = "unknown", 
            only_set_once: list[str] | None = None, 
            condition_expression: str = None,
            extra_expression_attr_names: dict[str, str] | None = None, 
            extra_expression_attr_values: dict[str, object] | None = None,):
    logger.info(f"Update Ticket: {request_data}")

    TABLE_NAME = ORG_TABLE_NAME_TEMPLATE.replace("org_name", organisationSlug)
    table = db.Table(TABLE_NAME)
    logger.info(f"Updating ticket for {eventId} of {organisationSlug} into {TABLE_NAME}")

    current_time = datetime.now(timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z')
    logger.info(f"Current Time: {current_time}")

    try:
        ticket_model = TicketModel.model_validate({
                **request_data.ticket.model_dump(mode="json", exclude_unset=True),
                "organisation": organisationSlug,
                "parent_event_ksuid": eventId,
                "updated_at": current_time
            })

        response = ticket_model.upsert(table, only_set_once, explicit_fields_only=True, condition_expression=condition_expression, extra_expression_attr_names=extra_expression_attr_names, extra_expression_attr_values=extra_expression_attr_values)

        if not response.success:
            raise RuntimeError(response.error or "Failed to upsert ticket")
        
        trigger_eventbridge_event(eventbridge, 
                            source="dance-engine.core" if not STAGE_NAME == "preview" else "dance-engine.core.preview", 
                                  resource_type=EventType.event,
                                  action=Action.updated,
                                  organisation=organisationSlug,
                                  resource_id=ticket_model.PK,
                                  data=request_data.model_dump(mode="json"),
                                  meta={"accountId":actor})
        return make_response(201, {
            "message": "Event updated successfully.",
            "ticket": ticket_model.model_dump(mode="json"),
        })        

    except ValidationError as e:
        logger.error("Validation error: %s", str(e))
        logger.error(traceback.format_exc())
        return make_response(400, {
            "message": "Invalid update request",
            "error": str(e)
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
    
def update(request_data: UpdateTicketRequest, organisationSlug: str, eventId: str, actor: str = "unknown"):
    return _update(request_data, 
                   organisationSlug=organisationSlug, 
                   eventId=eventId, 
                   actor=actor,
                   only_set_once=["created_at", "ticket_creation_key", "ksuid", "qr_token"])

def validate_jwt(request: ValidateTicketJwtRequest, ticketId:str, organisationSlug: str, eventId: str, actor: str) -> bool:
        # 1. check validity of token itself by decoding
        # 2. get the ticket it is referencing
        # 3. check ticket_status is 'active'
        # 4. check admission_status is not 'admitted'
    # 5. check if valid for this event 
    # 6. return valid or not with reason if not valid
    token = request.qr_token

    if not token:
        return make_response(400, {"message": "No token provided."})
    
    try:
        decoded = jwt.decode(
            token,
            TICKET_QR_JWT_SECRET,
            algorithms=["HS256"],
            audience="1",
            issuer="DANCEENGINE",
        )
    except jwt.InvalidTokenError as e:
        logger.info(f"Invalid ticket JWT for {organisationSlug}:{eventId} by {actor}: {str(e)}")
        response = ValidateTicketJwtResponse(**{"valid":False, "ticket": None, "reason": "Invalid token."})
        return make_response(400, response.model_dump(mode="json"))
    
    if decoded.get("o") != organisationSlug or decoded.get("e") != eventId:
        logger.info(f"Ticket JWT scope mismatch for {organisationSlug}:{eventId} by {actor}. Token organisation={decoded.get('o')} event={decoded.get('e')}")
        response = ValidateTicketJwtResponse(**{"valid":False, "ticket": None, "reason": "Token organisation and/or event do not match request."})
        return make_response(400, response.model_dump(mode="json"))
    
    if not decoded.get('sub') or decoded.get('sub') != ticketId:
        logger.info(f"Ticket JWT ticket ID mismatch for {organisationSlug}:{eventId} by {actor}. Token ticket ID={decoded.get('sub')}")
        response = ValidateTicketJwtResponse(**{"valid":False, "ticket": None, "reason": "Token ticket ID does not match request."})
        return make_response(400, response.model_dump(mode="json"))
    
    ticket = get_single_ticket(organisationSlug, eventId, ticketId, actor=actor)
    if ticket is None:
        logger.info(f"Ticket not found for valid JWT for {organisationSlug}:{eventId} by {actor}. Ticket ID={decoded.get('sub')}")
        response = ValidateTicketJwtResponse(**{"valid":False, "ticket": None, "reason": "Ticket not found."})
        return make_response(404, response.model_dump(mode="json"))

    admission_status = ticket.admission_status or AdmissionStatus.not_checked_in
    ticket_status = ticket.ticket_status or TicketStatus.active
    ticket_event_id = ticket.parent_event_ksuid or eventId

    if admission_status == AdmissionStatus.checked_in or admission_status == AdmissionStatus.denied:
        logger.info(f"Ticket with invalid admission status for valid JWT for {organisationSlug}:{eventId} by {actor}. Ticket ID={decoded.get('sub')} admission_status={admission_status}")
        response = ValidateTicketJwtResponse(**{"valid":True, "ticket": ticket, "reason": f"Ticket has already been {admission_status.value}."})
        return make_response(200, response.model_dump(mode="json"))
    
    if ticket_status != TicketStatus.active:
        logger.info(f"Ticket with non-active status for valid JWT for {organisationSlug}:{eventId} by {actor}. Ticket ID={decoded.get('sub')} status={ticket_status}")
        response = ValidateTicketJwtResponse(**{"valid":False, "ticket": ticket, "reason": "Ticket is not active."})
        return make_response(200, response.model_dump(mode="json"))

    # This is already checked above when validating token, I suppose not a bad to check again with db data. 
    # TODO I still want to do a bit more to check validity of the ticket for the event, maybe with warning based on event timing (e.g if the event has past)
    if ticket_event_id != eventId:
        logger.info(f"Ticket event mismatch for valid JWT for {organisationSlug}:{eventId} by {actor}. Ticket ID={decoded.get('sub')} ticket_event={ticket_event_id}")
        response = ValidateTicketJwtResponse(**{"valid":False, "ticket": ticket, "reason": "Ticket does not belong to this event."})
        return make_response(200, response.model_dump(mode="json"))

    logger.info(f"Valid ticket JWT for {organisationSlug}:{eventId} by {actor}. Ticket ID={decoded.get('sub')}")
    response = ValidateTicketJwtResponse(**{"valid":True, "ticket": ticket, "reason": None})
    return make_response(200, response.model_dump(mode="json"))

def use_ticket(request_data: TicketAdmissionRequest, ticketId: str, organisationSlug: str, eventId: str, actor: str):
    logger.info(f"Update Ticket: {request_data}")

    TABLE_NAME = ORG_TABLE_NAME_TEMPLATE.replace("org_name", organisationSlug)
    table = db.Table(TABLE_NAME)
    logger.info(f"Updating ticket for {eventId} of {organisationSlug} into {TABLE_NAME}")

    current_time = datetime.now(timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z')
    logger.info(f"Current Time: {current_time}")

    # I would rather not have to get a ticket here, it will slow down checkin
    # check_in_count was intentionally left blank for this reason.
    # TODO the solution is to implement the extended functions of transact_upsert here to do the addition on the write and only use conditions to check ticket exists. 
    existing_ticket = get_single_ticket(organisationSlug, eventId, ticketId, actor=actor)
    if existing_ticket is None:
        return make_response(404, {
            "message": "Ticket not found.",
        })

    customer_email = (request_data.customer_email or "").strip()
    if not customer_email:
        return make_response(400, {
            "message": "Ticket cannot be used.",
            "reason": "A customer email is required.",
        })

    next_check_in_count = (existing_ticket.check_in_count or 0) + 1

    try:
        ticket_model = TicketModel.model_validate({
                "ksuid": ticketId,
                "customer_email": customer_email,

                "organisation": organisationSlug,
                "parent_event_ksuid": eventId,

                "admission_status": AdmissionStatus.checked_in,
                "ticket_status": TicketStatus.used,
                "checked_in_at": current_time,
                "checked_in_by": actor,
                "check_in_count": next_check_in_count,

                "name": "ishouldnothavethisvalue", # to satisfy validation will not be actualyl changed to this
                "name_on_ticket": "ishouldnothavethisvalue", # to satisfy validation will not be actualyl changed to this
            })

        response = ticket_model.upsert(table, 
                                       explicit_fields_only=True, 
                                       only_set_once=["created_at", "ticket_creation_key", "ksuid", "qr_token", "name", "name_on_ticket"], 
                                       condition_expression=(
                                           # TODO to be depricated later because this assumes tickets without those attributes are valid 
                                            "(attribute_not_exists(#ticket_status) OR #ticket_status = :active_status) AND "
                                            "(attribute_not_exists(#admission_status) OR #admission_status = :not_checked_in_status)"
                                        ), 
                                       extra_expression_attr_names={
                                            "#ticket_status": "ticket_status",
                                            "#admission_status": "admission_status"
                                       }, 
                                       extra_expression_attr_values={
                                           ":active_status": TicketStatus.active.value,
                                           ":not_checked_in_status": AdmissionStatus.not_checked_in.value,
                                       }
                                    )
        
        trigger_eventbridge_event(eventbridge, 
                            source="dance-engine.core" if not STAGE_NAME == "preview" else "dance-engine.core.preview", 
                                  resource_type=EventType.event,
                                  action=Action.updated,
                                  organisation=organisationSlug,
                                  resource_id=ticket_model.PK,
                                  data=request_data.model_dump(mode="json"),
                                  meta={"accountId":actor})
        return make_response(201, {
            "message": "Event updated successfully.",
            "ticket": ticket_model.model_dump(mode="json"),
        })        
    except table.meta.client.exceptions.ConditionalCheckFailedException as e:
        logger.info(f"Ticket use failed conditional check for {organisationSlug}:{eventId} by {actor}. Ticket ID={ticketId}. Reason: {str(e)}")
        return make_response(400, {
            "message": "Ticket cannot be used.",
            "reason": "Ticket may already be used or checked in.",
        })
    except ValidationError as e:
        logger.error("Validation error: %s", str(e))
        logger.error(traceback.format_exc())
        return make_response(400, {
            "message": "Invalid update request",
            "error": str(e)
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

def unuse_ticket(request_data: TicketAdmissionRequest, ticketId: str, organisationSlug: str, eventId: str, actor: str):
    # TODO Again this can be done with just handling conditional check fails correctly, but this works for now
    existing_ticket = get_single_ticket(organisationSlug, eventId, ticketId, actor=actor)
    if existing_ticket is None:
        return make_response(404, {"message": "Ticket not found."})

    customer_email = (request_data.customer_email or "").strip()
    if not customer_email:
        return make_response(400, {
            "message": "Ticket cannot be reset.",
            "reason": "A customer email is required.",
        })

    ticket = {
        "ksuid": ticketId,
        "customer_email": customer_email,

        "organisation": organisationSlug,
        "parent_event_ksuid": eventId,

        "admission_status": AdmissionStatus.not_checked_in,
        "ticket_status": TicketStatus.active,
        "checked_in_at": datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace('+00:00', 'Z'),
        "checked_in_by": actor,

        "name": "ishouldnothavethisvalue", # to satisfy validation will not be actualyl changed to this
        "name_on_ticket": "ishouldnothavethisvalue", # to satisfy validation will not be actualyl changed to this
    }

    validated_request = UpdateTicketRequest(ticket=TicketModel(**ticket))
    return _update(validated_request, organisationSlug, eventId, actor,only_set_once=["created_at", "ticket_creation_key", "ksuid", "qr_token", "name", "name_on_ticket"])

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
            return make_response(200, resposne.model_dump(mode="json"))
        elif http_method == "POST":
            if raw_path.endswith("/validate"):
                validated_request = ValidateTicketJwtRequest(**parsed_event)
                return validate_jwt(validated_request, ticketId, organisationSlug, eventId, actor)
            if raw_path.endswith("/tickets/send"):
                validated_request = SendTicketEmailRequest(**parsed_event)
                return send_tickets(validated_request, organisationSlug, eventId, actor)
            if raw_path.endswith("/tickets/import"):
                validated_request = BulkImportTicketsRequest(**parsed_event)
                return import_tickets(validated_request, organisationSlug, eventId, actor)
            if raw_path.endswith("/use"):
                validated_request = TicketAdmissionRequest(**parsed_event)
                return use_ticket(validated_request, ticketId, organisationSlug, eventId, actor)
            if raw_path.endswith("/unuse"):
                validated_request = TicketAdmissionRequest(**parsed_event)
                return unuse_ticket(validated_request, ticketId, organisationSlug, eventId, actor)
            return make_response(404, {"message": "Unknown tickets action."})
        elif http_method == "PUT":
            validated_request = UpdateTicketRequest(**parsed_event)
            return update(validated_request, organisationSlug, eventId, actor)        
        else:
            return make_response(405, {"message": "Method not allowed."})
    else:
        # no longer process events from eventbridge
        logger.info("Triggered by EventBridge")
        return make_response(400, {"message": "EventBridge events are no longer processed by this lambda."})
