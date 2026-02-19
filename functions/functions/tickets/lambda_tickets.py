## python libraries
import os
import json
import boto3 # not a python library but is included in lambda without need to install it
import logging
import traceback
import sys
from datetime import datetime, timezone

## installed packages
from pydantic import AfterValidator, ValidationError # layer: pydantic
# from boto3.dynamodb.conditions import Key
from ksuid import KsuidMs # layer: utils

## custom scripts
sys.path.append(os.path.dirname(__file__))
from _shared.parser import parse_event
from _shared.DecimalEncoder import DecimalEncoder
from _shared.helpers import make_response
from _pydantic.models.models_extended import TicketModel, TicketChildModel
from _pydantic.EventBridge import trigger_eventbridge_event, EventType, Action, EventBridgeEvent # pydantic layer
#from _pydantic.dynamodb import VersionConflictError # pydantic layer
from _pydantic.dynamodb import batch_write, transact_upsert, VersionConflictError # pydantic layer

## logger setup
logger = logging.getLogger()
logger.setLevel("INFO")

## aws resources an clients
db = boto3.resource("dynamodb")

## ENV variables
# will throw an error if the env variable does not exist
STAGE_NAME = os.environ.get('STAGE_NAME') or (_ for _ in ()).throw(KeyError("Environment variable 'STAGE_NAME' not found"))
ORG_TABLE_NAME_TEMPLATE = os.environ.get('ORG_TABLE_NAME_TEMPLATE') or (_ for _ in ()).throw(KeyError("Environment variable 'ORG_TABLE_NAME_TEMPLATE' not found"))

from _pydantic.EventBridge import EventBridgeEventDetail  # Ensure this import is present

def create_ticket(request_data: EventBridgeEvent, organisation_slug: str, actor: str = "unknown"):
    logger.info(f"Creating ticket: {request_data}")
    event_detail: EventBridgeEventDetail = request_data.detail if "detail" in request_data else {}
    data = event_detail.data if "deta" in event_detail else {}

    TABLE_NAME = ORG_TABLE_NAME_TEMPLATE.replace("org_name", organisation_slug)
    table = db.Table(TABLE_NAME)
    logger.info(f"Creating ticket for {data.get("parent_event_ksuid")}, {organisation_slug} into {TABLE_NAME}")    

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

    ticket_model = TicketModel.model_validate({
        "ksuid": str(KsuidMs()),
        "organisation": organisation_slug,
        "created_at": current_time,
        "updated_at": current_time
        })    

def lambda_handler(event, context):
    logger.info("Received EventBridge event: %s", json.dumps(event, indent=2, cls=DecimalEncoder))

    type = event.get("detail-type", {})
    organisationSlug = event.get("detail", {}).get("organisation", {})

    if type == "checkout.completed":
        logger.info("Handling checkout.session.expired event.")
        validated_request = EventBridgeEvent(**event)

        return create_ticket(validated_request, organisationSlug)
    else:
        logger.warning(f"Received event type I can not currently process: {type}")
        return make_response(400, {"message": f"Unhandled event type: {type}"})