import sys
import os

import json
import logging
import boto3
import traceback
from datetime import datetime, timezone
from botocore.exceptions import ClientError
from boto3.dynamodb.conditions import Key

from ksuid import KsuidMs # utils layer

sys.path.append(os.path.dirname(__file__))
from _shared.parser import parse_event, validate_event
from _shared.DecimalEncoder import DecimalEncoder
from _shared.naming import getOrganisationTableName, generateSlug
from _shared.helpers import make_response
from _pydantic.EventBridge import triggerEBEvent, trigger_eventbridge_event, EventType, Action # pydantic layer
from _pydantic.dynamodb import VersionConflictError # pydantic layer
from _pydantic.models.organisation_models import OrganisationObject, OrganisationResponse, UpdateOrganisationRequest, Status
from models_extended import OrganisationModel

logger = logging.getLogger()
logger.setLevel("INFO")

db = boto3.resource("dynamodb")
eventbridge = boto3.client('events')

CORE_TABLE_NAME = os.environ.get("CORE_TABLE_NAME")
ORG_TABLE_NAME_TEMPLATE = os.environ.get('ORG_TABLE_NAME_TEMPLATE') or (_ for _ in ()).throw(KeyError("Environment variable 'ORG_TABLE_NAME_TEMPLATE' not found"))


def _preprocess_organisation_item(item: dict) -> dict:
    if 'status' in item and isinstance(item["status"], str):
        try:
            item["status"] = Status(item['status'])
        except ValueError:
            pass
    return item

def update_organisation(request_data: UpdateOrganisationRequest, organisation_slug: str, actor: str = "unknown"):
    logger.info(f"Updating Organisation: {request_data.model_dump}")

    TABLE_NAME = ORG_TABLE_NAME_TEMPLATE.replace("org_name",organisation_slug)
    table = db.Table(TABLE_NAME)
    logger.info(f"Updating organisation: {organisation_slug} in {TABLE_NAME}")

    current_time = datetime.now(timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z')
    logger.info(f"Current Time: {current_time}")

    org_data = request_data.organisation

    try:
        org_model = OrganisationModel.model_validate({
            **org_data.model_dump(mode="json", exclude_unset=True),
            "updated_at":current_time,
            "organisation": organisation_slug,
        })

        org_response = org_model.upsert(table, ["organisation", "created_at"])
        trigger_eventbridge_event(eventbridge, 
                                  source="dance-engine.core", 
                                  resource_type=EventType.organisation,
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

def get_organisation_settings(organisationSlug: str, public: bool = False, actor: str = "unknown"):
    TABLE_NAME = ORG_TABLE_NAME_TEMPLATE.replace("org_name",organisationSlug)
    table = db.Table(TABLE_NAME)
    logger.info(f"Getting settings of {organisationSlug} from {TABLE_NAME} / ")
    blank_model = OrganisationModel(name="blank", organisation=organisationSlug)

    try:
        result = blank_model.query_gsi(
            table,
            "IDXinv", 
            Key('PK').eq(f'{blank_model.PK}') & Key('SK').eq(f'{blank_model.SK}'),
            assemble_entites=True
            )
        logger.info(f"Found settings for {organisationSlug}: {result}")
    except Exception as e:
        logger.error(f"DynamoDB query failed to get settings for {organisationSlug}: {e}")
        raise Exception

    return OrganisationObject.model_validate(result)

def lambda_handler(event, context):
    try:
        logger.info("Received event: %s", json.dumps(event, indent=2, cls=DecimalEncoder))
        parsed_event = parse_event(event)
        http_method  = event['requestContext']["http"]["method"]

        organisationSlug = event.get("pathParameters", {}).get("organisation")
        is_public        = event.get("rawPath", "").startswith("/public")
        actor            = event.get("requestContext", {}).get("accountId", "unknown")

        # POST /{organisation}/settings
        if http_method == "POST":
            return make_response(405, {"message": "Method not allowed."})
        # GET 
        elif http_method == "GET":
            response_cls = OrganisationResponse #! not implemented public/private only private currently exists

            if not organisationSlug:
                return make_response(404, {"message": "Missing organisation in request"})
            
            result = get_organisation_settings(organisationSlug, actor=actor, public=is_public)
            response = response_cls(organisation=result)
            return make_response(200, response.model_dump(mode="json", exclude_none=True))
        
        # PUT /{organisation}/settings
        elif http_method == "PUT":
            if not organisationSlug:
                return make_response(404, {"message": "Missing organisation in request"})
            validated_request = UpdateOrganisationRequest(**parsed_event)
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

def eventbridge_handler(event, context):
    """
    Core handler for the organisation lambda function.
    This is the entry point for the Lambda function.
    """
    logger.info("Core handler invoked with event: %s", json.dumps(event, indent=2, cls=DecimalEncoder))
    core_table = db.Table(CORE_TABLE_NAME)
    logger.info("Organisation: %s", event.get("detail", {}).get("organisation", {}))
    current_time = datetime.now(timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z')

    org_data = event.get("detail", {}).get("data", {}).get("organisation", {})
    org_model = OrganisationModel.model_validate({
        **org_data,
        "updated_at":current_time,
        "organisation": event.get("detail", {}).get("organisation", {})
    })
    org_model.upsert(core_table, ["organisation", "created_at"])
    return True