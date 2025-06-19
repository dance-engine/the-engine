import sys
import os

import json
import logging
import boto3
import traceback
from datetime import datetime, timezone
from botocore.exceptions import ClientError
from boto3.dynamodb.conditions import Key

from ksuid import KsuidMs

sys.path.append(os.path.dirname(__file__))
from _shared.parser import parse_event, validate_event
from _shared.DecimalEncoder import DecimalEncoder
from _shared.naming import getOrganisationTableName, generateSlug
from _shared.EventBridge import triggerEBEvent, trigger_eventbridge_event, EventType, Action
from _shared.dynamodb import upsert, VersionConflictError
from _shared.helpers import make_response
from models_organisation import OrganisationObject, OrganisationResponse, OrganisationListResponse

logger = logging.getLogger()
logger.setLevel("INFO")

db = boto3.resource("dynamodb")
eventbridge = boto3.client('events')
ORG_TABLE_NAME_TEMPLATE = os.environ.get('ORG_TABLE_NAME_TEMPLATE') or (_ for _ in ()).throw(KeyError("Environment variable 'ORG_TABLE_NAME_TEMPLATE' not found"))

def update_organisation(request_data: OrganisationObject, organisation_slug: str, actor: str = "unknown"):
    logger.info(f"Updating Event: {request_data.model_dump}")

    TABLE_NAME = ORG_TABLE_NAME_TEMPLATE.replace("org_name",organisation_slug)
    table = db.Table(TABLE_NAME)
    logger.info(f"Updating event for {organisation_slug} into {TABLE_NAME}")

    current_time = datetime.now(timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z')
    logger.info(f"Current Time: {current_time}")

    event_data = request_data.event

    try:
        org_model = OrganisationObject.model_validate({
            **event_data.model_dump(mode="json", exclude_unset=True),
            "updated_at":current_time,
            "organisation": organisation_slug,
        })

        org_response = upsert(table, org_model, ["event_slug", "created_at"])
        trigger_eventbridge_event(eventbridge, 
                                  source="dance-engine.core", 
                                  resource_type=EventType.event,
                                  action=Action.updated,
                                  organisation=organisation_slug,
                                  resource_id=org_model.PK,
                                  data=request_data.model_dump(mode="json"),
                                  meta={"accountId":actor})
        return make_response(201, {
            "message": "Organisation updated successfully.",
            "organisation": org_model.model_dump(mode="json"),
        })
    except VersionConflictError as e:
        logger.error(f"Version Conflict")
        return make_response(409, {
            "message": "Version conflict",
            "resource": e.model.PK,
            "your_version": e.incoming_version
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

def get_organisation_settings(organisationSlug: str, public: bool = False):
    TABLE_NAME = ORG_TABLE_NAME_TEMPLATE.replace("org_name",organisationSlug)
    table = db.Table(TABLE_NAME)
    logger.info(f"Getting settings {organisationSlug} from {TABLE_NAME} / ")

    try:
        response = table.query(
            IndexName='IDXinv',  
            KeyConditionExpression=Key('SK').eq(f'ORG#{organisationSlug}')
        )
        items = response.get("Items", None)
        logger.info(f"Fetched {len(items)} from dynamodb: {items}")
    except Exception as e:
        logger.error(f"DynamoDB query failed for event {organisationSlug}: {e}")
        raise Exception
    
    organisation_items = [item for item in items if item.get("entity_type") == "ORGANISATION"]

    if len(organisation_items) == 0:
        logger.warning(f"No ORGANISATION entity found for ID {organisationSlug}")
        return None
    
    if len(organisation_items) > 1:
        logger.error(f"Multiple ORGANISATION entities found for {organisationSlug}.")
        raise Exception
    
    org_item = organisation_items[0] # Only one else exception raise
  

    try:
        org_model = OrganisationObject.model_validate(_preprocess_org_item(org_item))
        return make_response(200, { "organisation": org_model.model_dump(mode="json") })
    except Exception as e:
        logger.warning("Validation error in get_single_: %s", str(e))
        return None


def lambda_handler(event, context):
    try:
        logger.info("Received event: %s", json.dumps(event, indent=2, cls=DecimalEncoder))
        parsed_event = parse_event(event)
        http_method  = event['requestContext']["http"]["method"]

        organisationSlug = event.get("pathParameters", {}).get("organisation")
        is_public        = event.get("rawPath", "").startswith("/public")
        actor            = event.get("requestContext", {}).get("accountId", "unknown")

        # POST /{organisation}/events
        if http_method == "POST":
            return make_response(405, {"message": "Method not allowed."})
        # GET 
        elif http_method == "GET":
            if not organisationSlug:
                return make_response(404, {"message": "Missing organisation in request"})
            
            return get_organisation_settings(validated_request, organisationSlug, actor)
        # PUT /{organisation}/settings
        elif http_method == "PUT":
            if not organisationSlug:
                return make_response(404, {"message": "Missing organisation in request"})
            validated_request = OrganisationResponse(**parsed_event)
            return update_organisation(validated_request, organisationSlug, actor)
            
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