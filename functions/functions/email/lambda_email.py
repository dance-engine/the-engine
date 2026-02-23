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
#from boto3.dynamodb.conditions import Key
#from ksuid import KsuidMs # layer: utils

## custom scripts
sys.path.append(os.path.dirname(__file__))
from _shared.parser import parse_event
from _shared.DecimalEncoder import DecimalEncoder
from _shared.helpers import make_response
#from _pydantic.models.models_extended import EmailModel
#from _pydantic.EventBridge import triggerEBEvent, trigger_eventbridge_event, EventType, Action # pydantic layer
#from _pydantic.dynamodb import VersionConflictError # pydantic layer
#from _pydantic.dynamodb import batch_write, transact_upsert, VersionConflictError # pydantic layer

## logger setup
logger = logging.getLogger()
logger.setLevel("INFO")

## aws resources an clients
#db = boto3.resource("dynamodb")

## ENV variables
# will throw an error if the env variable does not exist
STAGE_NAME = os.environ.get('STAGE_NAME') or (_ for _ in ()).throw(KeyError("Environment variable 'STAGE_NAME' not found"))
BREVO_API_KEY = os.environ.get('BREVO_API_KEY') or (_ for _ in ()).throw(KeyError("Environment variable 'BREVO_API_KEY' not found"))

def send_ticket(event):
    logger.info("Sending ticket email")
    try:
        detail = event.get("detail", {})
        data   = detail.get("data", {})
        meta   = detail.get("meta", {})

        event_details = meta.get("event_details", {})
        ticket = data.get("ticket", {})

        # configure brevo api client
        client = Brevo(api_key=BREVO_API_KEY)

        template_params = {
            "qr_image_url": f"https://api.qrserver.com/v1/create-qr-code/?size=150x150&data={ticket.get('ksuid')}",
            "view_in_browser_url": f"https://api.qrserver.com/v1/create-qr-code/?size=150x150&data={ticket.get('ksuid')}",
            "brand_name": detail.get("organisation"),
            "event_name": event_details.get("name"),
            "event_date": event_details.get("date"),
            "event_time": event_details.get("time"),
            "venue_name": event_details.get("venue"),
            "customer_name": ticket.get("name_on_ticket"),
            "ticket_type": ticket.get("name"),
            "order_code": meta.get("stripe_order_code"),
            "ticket_code": ticket.get("ksuid"),
            "extra_notes": " "
        }   

        try:
            logger.info("Attempting to send email via Brevo")
            email_result = client.transactional_emails.send_transac_email(
                template_id=1,
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
    