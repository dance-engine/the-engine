## python libraries
import os
import json
import boto3 # not a python library but is included in lambda without need to install it
import logging
import traceback
import sys
from datetime import datetime, timezone

## installed packages
from brevo import Brevo # layer: brevo
from brevo.core.api_error import ApiError # layer: brevo
from brevo.transactional_emails.types import SendTransacEmailRequestToItem # layer: brevo
from pydantic import AfterValidator, ValidationError # layer: pydantic
from boto3.dynamodb.conditions import Key
from botocore.exceptions import ClientError
#from ksuid import KsuidMs # layer: utils

## custom scripts
sys.path.append(os.path.dirname(__file__))
from _shared.parser import parse_event
from _shared.DecimalEncoder import DecimalEncoder
from _shared.helpers import make_response
from _pydantic.models.models_extended import OrganisationModel, EventModel
#from _pydantic.EventBridge import triggerEBEvent, trigger_eventbridge_event, EventType, Action # pydantic layer
#from _pydantic.dynamodb import VersionConflictError # pydantic layer
#from _pydantic.dynamodb import batch_write, transact_upsert, VersionConflictError # pydantic layer

## logger setup
logger = logging.getLogger()
logger.setLevel("INFO")

## aws resources an clients
db = boto3.resource("dynamodb")

## ENV variables
# will throw an error if the env variable does not exist
STAGE_NAME = os.environ.get('STAGE_NAME') or (_ for _ in ()).throw(KeyError("Environment variable 'STAGE_NAME' not found"))
BREVO_API_KEY = os.environ.get('BREVO_API_KEY') or (_ for _ in ()).throw(KeyError("Environment variable 'BREVO_API_KEY' not found"))
ORG_TABLE_NAME_TEMPLATE = os.environ.get('ORG_TABLE_NAME_TEMPLATE') or (_ for _ in ()).throw(KeyError("Environment variable 'ORG_TABLE_NAME_TEMPLATE' not found"))

def get_single_event(organisationSlug: str, eventId: str):
    TABLE_NAME = ORG_TABLE_NAME_TEMPLATE.replace("org_name", organisationSlug)
    table = db.Table(TABLE_NAME)
    logger.info(f"Getting event for {organisationSlug} from {TABLE_NAME}")
    blank_model = EventModel(ksuid=eventId, name="blank", organisation=organisationSlug)

    try:
        result = blank_model.query_gsi(
            table=table,
            index_name="IDXinv",
            key_condition=Key('SK').eq(f'{blank_model.PK}'),
            assemble_entites=True
        )
        logger.info(f"Found event for {organisationSlug}: {result}")
    except ClientError as e:
        if e.response['Error']['Code'] == 'ResourceNotFoundException':
            logger.error(f"Event not found for {organisationSlug}: {e}")
            return None
        raise
    except (ValueError, Exception) as e:
        logger.error(f"DynamoDB query failed to get event for {organisationSlug}: {e}")
        return None

    return [result]

def get_organisation_settings(organisationSlug: str) -> OrganisationModel:
    TABLE_NAME = ORG_TABLE_NAME_TEMPLATE.replace("org_name",organisationSlug)
    table = db.Table(TABLE_NAME)
    logger.info(f"Getting settings of {organisationSlug} from {TABLE_NAME} / ")
    blank_model = OrganisationModel(name="blank", organisation=organisationSlug)

    try:
        result = blank_model.query_gsi(
            table=table,
            index_name="IDXinv", 
            key_condition=Key('PK').eq(f'{blank_model.PK}') & Key('SK').eq(f'{blank_model.SK}'),
            assemble_entites=True
            )
        logger.info(f"Found settings for {organisationSlug}: {result}")
    except Exception as e:
        logger.error(f"DynamoDB query failed to get settings for {organisationSlug}: {e}")
        raise Exception

    return OrganisationModel.model_validate(result)

def send_ticket(event):
    logger.info("Sending ticket email")
    detail = event.get("detail", {})
    data   = detail.get("data", {})
    meta   = detail.get("meta", {})

    ticket = data.get("ticket", {})
    event_details: EventModel = get_single_event(detail.get("organisation"), ticket.get("parent_event_ksuid"))[0]

    template_params = {}

    try:
        organisation_settings = get_organisation_settings(detail.get("organisation"))
        required_fields = ["colour_background", "logo"]

        if organisation_settings.org_slug == "rebel-sbk":
            tempalte_id = 2
            template_params = {
                "brand_background_colour": "000",
                "brand_logo_url": organisation_settings.banner
            }
        else:
            missing_fields = [field for field in required_fields if not hasattr(organisation_settings, field)]
            if missing_fields:
                logger.error(f"Missing fields in organisation settings: {', '.join(missing_fields)}")
                raise Exception(f"Missing fields in organisation settings: {', '.join(missing_fields)}")
            
            tempalte_id = 2
            template_params = {
                "brand_background_colour": organisation_settings.colour_background.strip("#"),
                "brand_logo_url": organisation_settings.logo
            }
    except Exception as e:
        logger.error(f"Failed to get organisation settings for {detail.get('organisation')}: {e}")
        tempalte_id = 1

    try:
        # configure brevo api client
        client = Brevo(api_key=BREVO_API_KEY)

        template_params = {
            **template_params,
            "qr_image_url": f"https://api.qrserver.com/v1/create-qr-code/?size=300x300&data={ticket.get('qr_token')}",
            "view_in_browser_url": f"https://api.qrserver.com/v1/create-qr-code/?size=300x300&data={ticket.get('qr_token')}",
            "brand_name": detail.get("organisation"),
            "event_name": event_details.name,
            "event_date": event_details.starts_at.strftime("%d{} %B %Y").format("th" if 11 <= event_details.starts_at.day <= 13 else {1: "st", 2: "nd", 3: "rd"}.get(event_details.starts_at.day % 10, "th")) if event_details.starts_at else None,
            "event_time": event_details.starts_at.strftime("%I:%M %p").lstrip("0") if event_details.starts_at else None,
            "venue_name": event_details.location.name if event_details.location else None,
            "customer_name": ticket.get("name_on_ticket"),
            "ticket_type": ticket.get("name"),
            "order_code": meta.get("stripe_order_code"),
            "ticket_code": ticket.get("ksuid"),
            "extra_notes": " "
        }   

        try:
            logger.info("Attempting to send email via Brevo")
            logger.info(f"Email details - To: {ticket.get('customer_email')}, Template ID: {tempalte_id}, Params: {json.dumps(template_params, indent=2)}")
            email_result = client.transactional_emails.send_transac_email(
                template_id=tempalte_id,
                to=[SendTransacEmailRequestToItem(email=ticket.get("customer_email"))],
                params=template_params
            )
            return "Success"
        except ApiError as e:
            logger.error("Exception when calling Brevo API: %s\n", e)
            return e
    except Exception as e:
        logger.error("Unexpected error occured: %s\n", e)
        return e

def lambda_handler(event, context):
    logger.info("Received EventBridge event: %s", json.dumps(event, indent=2, cls=DecimalEncoder))

    type = event.get("detail-type", {})
    if type == "ticket.created":
        logger.info("Handling ticket.created event.")
        return send_ticket(event)
    else:
        logger.warning(f"Received event type I can not currently process: {type}")
        return make_response(400, {"message": f"Unhandled event type: {type}"})
    