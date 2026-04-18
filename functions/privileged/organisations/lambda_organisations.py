## python libraries
import os
import json
import boto3 
import logging
import traceback
from urllib.parse import urlparse

## installed packages
from pydantic import ValidationError # layer: pydantic
from botocore.exceptions import ClientError
from boto3.dynamodb.conditions import Key

## custom scripts
from _shared.DecimalEncoder import DecimalEncoder
from _shared.helpers import make_response
from _shared.parser import parse_event
from _shared.naming import generateSlug
from _pydantic.models.organisation_models import CreateOrganisationRequest, OrganisationsListResponsePublic, OrganisationsListResponse
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
            table=table,
            index_name="typeIDX", 
            key_condition=Key('entity_type').eq(blank_model.entity_type) & Key('PK').begins_with(f"{blank_model.PK.split('#')[0]}#"),
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
    requested_slug = (request_data.organisation.organisation or "").strip()
    requested_name = (request_data.organisation.name or "").strip()

    if requested_slug:
        organisation_slug = generateSlug(requested_slug)
    elif requested_name:
        organisation_slug = generateSlug(requested_name)
    else:
        return make_response(400, {"message": "Either organisation slug or name is required."})

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
        stack_id = response["StackId"]
        logger.info(f"Created stack: {stack_name} StackId: {stack_id}")

        # Persist the StackId ARN on the organisation record so status lookups
        # can use it directly rather than reconstructing the StackName.
        organisation_model.cf_stack_id = stack_id
        organisation_model.upsert(table, only_set_once=[])
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

# Maps each CloudFormation StackStatus to a UI-friendly progress value.
# https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/using-cfn-describing-stacks.html
STACK_PROGRESS = {
    "CREATE_IN_PROGRESS":       {"pct": 30,  "done": False, "ok": True},
    "CREATE_COMPLETE":          {"pct": 100, "done": True,  "ok": True},
    "CREATE_FAILED":            {"pct": 100, "done": True,  "ok": False},
    "ROLLBACK_IN_PROGRESS":     {"pct": 60,  "done": False, "ok": False},
    "ROLLBACK_COMPLETE":        {"pct": 100, "done": True,  "ok": False},
    "ROLLBACK_FAILED":          {"pct": 100, "done": True,  "ok": False},
    "DELETE_IN_PROGRESS":       {"pct": 50,  "done": False, "ok": False},
    "DELETE_COMPLETE":          {"pct": 100, "done": True,  "ok": False},
    "DELETE_FAILED":            {"pct": 100, "done": True,  "ok": False},
    "UPDATE_IN_PROGRESS":       {"pct": 30,  "done": False, "ok": True},
    "UPDATE_COMPLETE":          {"pct": 100, "done": True,  "ok": True},
    "UPDATE_ROLLBACK_COMPLETE": {"pct": 100, "done": True,  "ok": False},
}

def get_stack_status(organisation_slug: str):
    logger.info(f"Getting stack status for organisation: {organisation_slug}")
    # Use generateSlug to match the same key used during create_organisation
    normalised_slug = generateSlug(organisation_slug)
    blank_model = OrganisationModel(name="blank", organisation=normalised_slug)

    # Look up the organisation record to retrieve the stored StackId ARN.
    try:
        result = table.get_item(Key={"PK": blank_model.PK, "SK": blank_model.SK})
        item = result.get("Item")
    except Exception as e:
        logger.error(f"DynamoDB lookup failed: {e}")
        return make_response(500, {"message": "Failed to look up organisation."})

    if not item:
        return make_response(404, {"message": f"Organisation '{organisation_slug}' not found."})

    stack_id = item.get("cf_stack_id")
    if not stack_id:
        return make_response(404, {"message": "No CloudFormation StackId found for this organisation. Stack may not have been created yet."})

    # Use the StackId ARN — more reliable than StackName after deletions/recreations.
    try:
        cf_response = cloudformation.describe_stacks(StackName=stack_id)
        stack = cf_response["Stacks"][0]
        stack_status = stack["StackStatus"]

        events_response = cloudformation.describe_stack_events(StackName=stack_id)
        recent_events = [
            {
                "logicalResourceId": e["LogicalResourceId"],
                "resourceType": e["ResourceType"],
                "resourceStatus": e["ResourceStatus"],
                "timestamp": e["Timestamp"].isoformat(),
                "statusReason": e.get("ResourceStatusReason"),
            }
            for e in events_response["StackEvents"][:20]
        ]
    except ClientError as e:
        if e.response["Error"]["Code"] in ["AccessDenied", "AccessDeniedException"]:
            return make_response(403, {
                "message": "Not authorized to read CloudFormation stack status. Ensure role has cloudformation:DescribeStacks and cloudformation:DescribeStackEvents.",
                "error": e.response["Error"]["Code"],
            })
        if e.response["Error"]["Code"] == "ValidationError":
            return make_response(404, {"message": f"Stack not found for StackId: {stack_id}"})
        logger.error(f"CloudFormation describe_stacks failed: {e}")
        raise

    progress = STACK_PROGRESS.get(stack_status, {"pct": 50, "done": False, "ok": True})

    return make_response(200, {
        "organisation": organisation_slug,
        "stackId": stack_id,
        "stackName": stack["StackName"],
        "stackStatus": stack_status,
        "pct": progress["pct"],
        "done": progress["done"],
        "ok": progress["ok"],
        "recentEvents": recent_events,
    })


def lambda_handler(event, context):
    try:
        logger.info("Received event: %s", json.dumps(event, indent=2, cls=DecimalEncoder))
        parsed_event = parse_event(event)
        http_method  = event['requestContext']["http"]["method"]

        is_public        = event.get("rawPath", "").startswith("/public")
        actor            = event.get("requestContext", {}).get("accountId", "unknown")
        raw_path         = event.get("rawPath", "")
        path_params      = event.get("pathParameters") or {}
        organisation_id  = path_params.get("organisationId")

        # POST
        if http_method == "POST":
            validated_request = CreateOrganisationRequest(**parsed_event)
            return create_organisation(validated_request, actor)
        # GET /organisations/{organisationId}/stack-status
        elif http_method == "GET" and raw_path.endswith("/stack-status") and organisation_id:
            return get_stack_status(organisation_id)
        # GET /organisations or /public/organisations
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
    