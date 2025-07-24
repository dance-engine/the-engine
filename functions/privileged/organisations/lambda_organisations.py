## python libraries
import os
import json
import boto3 
import logging
import traceback
from urllib.parse import urlparse

## installed packages
from pydantic import AfterValidator, ValidationError # layer: pydantic
from botocore.exceptions import ClientError
from boto3.dynamodb.conditions import Key

## custom scripts
from _shared.DecimalEncoder import DecimalEncoder
from _shared.helpers import make_response
from _shared.parser import parse_event
from _shared.naming import generateSlug
from _pydantic.models.organisation_models import CreateOrganisationRequest, OrganisationsListResponsePublic, OrganisationObject, OrganisationsListResponse
from _pydantic.models.models_extended import OrganisationModel
from _pydantic.EventBridge import trigger_eventbridge_event, EventType, Action # pydantic layer

## logger setup
logger = logging.getLogger()
logger.setLevel("INFO")

## ENV variables
# will throw an error if the env variable does not exist
STAGE_NAME = os.environ.get('STAGE_NAME') or (_ for _ in ()).throw(KeyError("Environment variable 'STAGE_NAME' not found"))
TEMPLATE_URL    = os.environ.get('TEMPLATE_URL') or (_ for _ in ()).throw(KeyError("Environment variable 'TEMPLATE_URL' not found"))
CORE_TABLE_NAME = os.environ.get('CORE_TABLE_NAME') or (_ for _ in ()).throw(KeyError("Environment variable 'CORE_TABLE_NAME' not found"))
ORG_TABLE_NAME_TEMPLATE = os.environ.get('ORG_TABLE_NAME_TEMPLATE') or (_ for _ in ()).throw(KeyError("Environment variable 'ORG_TABLE_NAME_TEMPLATE' not found"))

## aws resources an clients
db = boto3.resource("dynamodb")
s3 = boto3.client("s3")
eventbridge    = boto3.client('events')
cloudformation = boto3.client("cloudformation")

table = db.Table(CORE_TABLE_NAME)

def get(public: bool = False):
    logger.info(f"Getting organisations from {CORE_TABLE_NAME}")
    blank_model = OrganisationModel(name="blank", organisation="blank")

    try:
        orgs = blank_model.query_gsi(
            table,
            "typeIDX", 
            Key('entity_type').eq(blank_model.entity_type) & Key('PK').begins_with(f"{blank_model.PK.split('#')[0]}#"),
        )
        logger.info(f"Found organisation: {orgs}")
    except Exception as e:
        logger.error(f"DynamoDB query failed to get organisations: {e}")
        raise Exception
    
    if public:
        logger.info(f"Returning public organisation objects: {[o.to_public() if public else o for o in orgs]}")

    return [o.to_public() if public else o for o in orgs]

def create_organisation(request_data: CreateOrganisationRequest, actor: str):
    logger.info(f"Create organisation: {request_data}")
    organisation_slug = generateSlug(request_data.organisation.name)

    logger.info(f"Initialising the creation of an organisation for {organisation_slug}")

    organisation_data = request_data.organisation
    organisation_model = OrganisationModel.model_validate({
        **organisation_data.model_dump(mode="json", exclude_unset=True),
        "organisation": organisation_slug,
    })

    try:
        parsed = urlparse(TEMPLATE_URL)
        bucket = parsed.netloc.split(".s3")[0]
        key = parsed.path.lstrip("/")
    except IndexError:
        raise ValueError("TEMPLATE_URL must be a full S3 URL (e.g., https://bucket.s3.amazonaws.com/path/to/file.yaml)")
    
    logger.info(f"Bucket: {bucket} Key: {key}")
    signed_url = s3.generate_presigned_url(
        "get_object",
        Params={"Bucket": bucket, "Key": key},
        ExpiresIn=300  # 5 minutes
    )

    stack_name = f"{STAGE_NAME}-org-{organisation_slug}"
    logger.info(f"Using signed template URL: {signed_url}")

    # create item in core table
    try:
        organisation_response = organisation_model.upsert(table,["organisation","created_at"],condition_expression="attribute_not_exists(PK)")
        logger.info(f"Organisation item created in core table: {organisation_response}")
    except ClientError as e:
        if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
            logger.warning("Organisation with this name already exists: %s", organisation_slug)
            return None
        else:
            logger.error("Error writing organisation to DB: %s", str(e))
            logger.error(traceback.format_exc())
            raise
    except ValidationError as e:
        logger.error("Invalid organisation data: %s", str(e))
        raise ValueError("Invalid organisation model")
    except Exception as e:
        logger.error("Unexpected error: %s", str(e))
        logger.error(traceback.format_exc())
        return make_response(500, {"message": "Something went wrong."})
    
    # create cloudformation stack
    try:
        response = cloudformation.create_stack(
            StackName=stack_name,
            TemplateURL=signed_url,
            Parameters=[
                {"ParameterKey": "OrganisationId", "ParameterValue": organisation_slug},
                {"ParameterKey": "Stage", "ParameterValue": STAGE_NAME},
            ],
            Capabilities=["CAPABILITY_NAMED_IAM"],
            Tags=[
                {"Key": "OrganisationId", "Value": organisation_slug}
            ]
        )
        logger.info(f"Created stack: {stack_name}")
        trigger_eventbridge_event(eventbridge, 
                                  source="dance-engine.privileged.organisations" if not STAGE_NAME == "preview" else "dance-engine.privileged.preview.organisations", 
                                  resource_type=EventType.organisation,
                                  action=Action.created,
                                  organisation=organisation_slug,
                                  resource_id=organisation_model.PK,
                                  data=request_data.model_dump(mode="json"),
                                  meta={"accountId":actor})
        return make_response(201, {
            "message": "Organisation creation intiated successfully.",
            "event": organisation_model.model_dump_json(),
        })
    except ClientError as e:
        if e.response["Error"]["Code"] == "AlreadyExistsException":
            logger.warning(f"Stack for {organisation_slug} already exists")
        else:
            logger.error("Error creating organisation stack %s: %s", organisation_slug, str(e))
            logger.error(traceback.format_exc())
            raise 
    except Exception as e:
        logger.error("Unexpected error: %s", str(e))
        logger.error(traceback.format_exc())
        return make_response(500, {"message": "Something went wrong."})

def lambda_handler(event, context):
    try:
        logger.info("Received event: %s", json.dumps(event, indent=2, cls=DecimalEncoder))
        parsed_event = parse_event(event)
        http_method  = event['requestContext']["http"]["method"]

        is_public        = event.get("rawPath", "").startswith("/public")
        actor            = event.get("requestContext", {}).get("accountId", "unknown")

        # POST
        if http_method == "POST":
            validated_request = CreateOrganisationRequest(**parsed_event)
            return create_organisation(validated_request, actor)
        # GET 
        elif http_method == "GET":
            list_response_cls = OrganisationsListResponsePublic if is_public else OrganisationsListResponse

            result = get(public=is_public)
            response = list_response_cls(organisations=result)
            return make_response(200, response.model_dump(mode="json", exclude_none=True))     

    except ValueError as e:
        logger.error("Validation error: %s", str(e))
        logger.error(traceback.format_exc())
        return make_response(400,{"message": "Validation error.", "error": str(e)})
    except Exception as e:
        logger.error("Unexpected error: %s", str(e))
        logger.error(traceback.format_exc())
        return make_response(500, {"message": "Internal server error.", "error": str(e)})
    