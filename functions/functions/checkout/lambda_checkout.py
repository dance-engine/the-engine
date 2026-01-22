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
#from boto3.dynamodb.conditions import Key
#from ksuid import KsuidMs # layer: utils

## custom scripts
sys.path.append(os.path.dirname(__file__))
from _shared.parser import parse_event
from _shared.DecimalEncoder import DecimalEncoder
from _shared.helpers import make_response
from _pydantic.models.checkout_models import CheckoutObject, CheckoutResponse
#from _pydantic.models.models_extended import CheckoutModel
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

## write here the code which is called from the handler
def get(organisationSlug: str, public: bool = False, actor: str = "unknown") -> CheckoutObject:
    '''
    You expect me to return an instance of CheckoutObject.
    '''
    # TODO: implement
    return make_response(201, {
            "message": "It's a work in progress...",
        })

def lambda_handler(event, context):
    try:
        logger.info("Received event: %s", json.dumps(event, indent=2, cls=DecimalEncoder))
        parsed_event = parse_event(event)
        http_method  = event['requestContext']["http"]["method"]

        organisationSlug = event.get("pathParameters", {}).get("organisation")
        is_public        = event.get("rawPath", "").startswith("/public")
        actor            = event.get("requestContext", {}).get("accountId", "unknown")

        # POST
        if http_method == "POST":
            return make_response(405, {"message": "Method not implemented."})
        # PUT 
        if http_method == "PUT":
            return make_response(405, {"message": "Method not implemented."})
        # GET 
        elif http_method == "GET":
            response_cls = CheckoutResponse # The model response class defined in pydantic

            if not organisationSlug:
                return make_response(404, {"message": "Missing organisation in request"})            
            
            result = get(organisationSlug)
            response = response_cls(checkout=result)
            return make_response(200, response.model_dump(mode="json", exclude_none=True))     

    except ValueError as e:
        logger.error("Validation error: %s", str(e))
        logger.error(traceback.format_exc())
        return make_response(400,{"message": "Validation error.", "error": str(e)})
    except Exception as e:
        logger.error("Unexpected error: %s", str(e))
        logger.error(traceback.format_exc())
        return make_response(500, {"message": "Internal server error.", "error": str(e)})
    