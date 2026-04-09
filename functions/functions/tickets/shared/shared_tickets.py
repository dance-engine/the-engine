import logging

from boto3.dynamodb.conditions import Key
from botocore.exceptions import ClientError

from pydantic import ValidationError # layer: pydantic
from _pydantic.models.models_extended import TicketModel, EventModel
from _pydantic.email_models import EmailTemplates, EmailJob, EmailRecipient, JobTypes # pydantic layer

## logger setup
logger = logging.getLogger()
logger.setLevel("INFO")

def _normalise_entity_type(entity_type: str | None) -> str:
    return (entity_type or "").strip().lower()

def _build_ticket_name(line_items: list[dict]) -> str:
    bundle_names = []
    item_names = []
    other_names = []

    for line_item in line_items or []:
        name = (line_item.get("name") or "").strip()
        if not name:
            continue

        entity_type = _normalise_entity_type(line_item.get("entity_type"))
        if entity_type == "bundle":
            bundle_names.append(name)
        elif entity_type == "item":
            item_names.append(name)
        else:
            other_names.append(name)

    if bundle_names:
        bundle_label = " and ".join(bundle_names)
        if item_names:
            return f"{bundle_label} with {', '.join(item_names)}"
        return bundle_label

    if item_names:
        return ", ".join(item_names)

    if other_names:
        return ", ".join(other_names)

    return "Ticket"

def get_single_ticket(table, organisationSlug: str,  eventId: str,  ticketId: str, public: bool = False, actor: str = "unknown"):
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

def get_single_event(organisationSlug: str, eventId: str, table):
    logger.info(f"Getting event for {organisationSlug}")
    blank_model = EventModel(ksuid=eventId, name="blank", organisation=organisationSlug)

    try:
        result = blank_model.query_gsi(
            table=table,
            index_name="IDXinv",
            key_condition=Key('SK').eq(f'{blank_model.PK}'),
            assemble_entites=True
        )
        # logger.info(f"Found event for {organisationSlug}: {result}")
    except ClientError as e:
        if e.response['Error']['Code'] == 'ResourceNotFoundException':
            logger.error(f"Event not found for {organisationSlug}: {e}")
            return None
        raise
    except (ValueError, Exception) as e:
        logger.error(f"DynamoDB query failed to get event for {organisationSlug}: {e}")
        return None

    return [result]

def create_email_job(table, ticket: TicketModel, organisation_slug: str, checkout_id: str, actor: str):
    event_details: EventModel = get_single_event(organisation_slug, ticket.parent_event_ksuid, table)[0]

    logger.info(f"Preparing email send request for ticket {ticket.PK} of event {event_details.name} to be sent to {ticket.customer_email} with QR token {ticket.qr_token}")
    template_params = {
        "qr_image_url": f"https://api.qrserver.com/v1/create-qr-code/?size=300x300&data={ticket.qr_token}",
        "view_in_browser_url": f"https://api.qrserver.com/v1/create-qr-code/?size=300x300&data={ticket.qr_token}",
        "event_name": event_details.name,
        "event_date": event_details.starts_at.strftime("%d{} %B %Y").format("th" if 11 <= event_details.starts_at.day <= 13 else {1: "st", 2: "nd", 3: "rd"}.get(event_details.starts_at.day % 10, "th")) if event_details.starts_at else None,
        "event_time": event_details.starts_at.strftime("%I:%M %p").lstrip("0") if event_details.starts_at else None,
        "venue_name": event_details.location.name if event_details.location else None,
        "customer_name": ticket.name_on_ticket,
        "ticket_type": ticket.name,
        "order_code": " ", # TODO
        "ticket_code": ticket.ksuid,
        "extra_notes": " "
    }

    try:
        job_request = EmailJob(
            job_type=JobTypes.send_ticket_email,
            job_id=f"send_ticket_email:{ticket.PK}",
            organisation=organisation_slug,
            template=EmailTemplates.ticket_dynamic,
            send_reason="new_sale",
            recipient=EmailRecipient(
                email=ticket.customer_email,
                name=ticket.name_on_ticket
            ),
            idempotency_key=f"ticket:create:checkout:{checkout_id}",
            correlation_id=f"checkout:{checkout_id}",
            params=template_params
        )
        logger.info("EmailJob created successfully")
    except ValidationError as e:
        logger.error("EmailJob validation failed: %s", e)
        raise

    return job_request