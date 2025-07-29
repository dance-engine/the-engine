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
from _pydantic.models.bundles_models import BundleObject, BundleResponse, CreateBundleRequest, BundleListResponse, BundleResponsePublic, BundleListResponsePublic, UpdateBundleRequest
#from _pydantic.models.models_extended import BundlesModel
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

def get_one(organisationSlug: str,  eventId: str,  bundleId: str, public: bool = False, actor: str = "unknown"):
    '''
    You expect me to return an instance of BundleObject.
    '''
    # TODO: implement
    return make_response(201, {
            "message": "It's a work in progress...",
            "item": {"message": "You expect me to return an instance of BundleObject."}
        })

def get_all(organisationSlug: str,  eventId: str, public: bool = False, actor: str = "unknown"):
    '''
    You expect me to return a list of instances of BundleObject.
    '''
    # TODO: implement
    return make_response(201, {
            "message": "It's a work in progress... You expect me to return a list of instances of BundleObject.",
            "items": [{"message": "You expect me to return a list of instances of BundleObject."}]
        })

def update(request: UpdateBundleRequest, organisationSlug: str, eventId: str, actor: str = "unknown"):
    return make_response(201, {
            "message": "It's a work in progress...",
            "items": [{"message": "You expect me to return a list of instances of BundleObject I just updated."}]
        })

def create(request: CreateBundleRequest, organisationSlug: str, eventId: str, actor: str = "unknown"):
    return make_response(201, {
            "message": "It's a work in progress...",
            "items": [{"message": "You expect me to return a list of instances of BundleObject I just created."}]
        })

def lambda_handler(event, context):
    try:
        logger.info("Received event: %s", json.dumps(event, indent=2, cls=DecimalEncoder))
        parsed_event = parse_event(event)
        http_method  = event['requestContext']["http"]["method"]

        organisationSlug = event.get("pathParameters", {}).get("organisation")
        bundleId         = event.get("pathParameters", {}).get("ksuid")
        eventId          = event.get("pathParameters", {}).get("event")
        is_public        = event.get("rawPath", "").startswith("/public")
        actor            = event.get("requestContext", {}).get("accountId", "unknown")

        if not eventId: 
            return make_response(404, {"message": "Missing event ID in request path."})

        # POST /{organisation}/events
        if http_method == "POST":
            validated_request = CreateBundleRequest(**parsed_event)
            return create(validated_request, organisationSlug, eventId, actor)

        # GET 
        elif http_method == "GET":
            logger.info(f"{organisationSlug}:{eventId}")
            response_cls = BundleListResponsePublic if is_public else BundleResponse
            list_response_cls = BundleListResponsePublic if is_public else BundleListResponse

            if bundleId:
                return get_one(organisationSlug, eventId, bundleId, public=is_public)
                result = get_one(organisationSlug, eventId, itemId, public=is_public)
                if result is None:
                    return make_response(404, {"message": "Bundle not found."})
                response = response_cls(event=result)
            else:
                return get_all(organisationSlug, eventId, public=is_public)
                result = get_all(organisationSlug, eventId, public=is_public)
                response = list_response_cls(items=result)
            
            return make_response(200, response.model_dump(mode="json", exclude_none=True))

        elif http_method == "PUT":
            validated_request = UpdateBundleRequest(**parsed_event)
            return update(validated_request, organisationSlug, eventId, actor)
            
        else:
            return make_response(405, {"message": "Method not allowed."})

    except ValueError as e:
        logger.error("Validation error: %s", str(e))
        logger.error(traceback.format_exc())
        return make_response(400,{"message": "Validation error.", "error": str(e)})
    except Exception as e:
        logger.error("Unexpected error: %s", str(e))
        logger.error(traceback.format_exc())
        return make_response(500, {"message": "Internal server error.", "error": str(e)})
    