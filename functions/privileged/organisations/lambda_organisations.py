## python libraries
import os
import json
import boto3 
import logging
import traceback
from datetime import datetime, timezone
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
from _pydantic.models.organisation_models import CreateOrganisationRequest, OrganisationsListResponsePublic, OrganisationsListResponse, Status
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
        if not organisation_response.success:
            logger.warning(
                "Organisation create upsert failed for %s: %s",
                organisation_slug,
                organisation_response.error,
            )
            return make_response(
                409,
                {
                    "message": "Organisation with this slug already exists or could not be created.",
                    "error": organisation_response.error,
                },
            )
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

        # Carry forward the latest stored version from the create write so the
        # follow-up write does not fail optimistic version checks.
        if organisation_response.item and isinstance(organisation_response.item, dict):
            stored_version = organisation_response.item.get("version")
            if stored_version is not None:
                try:
                    organisation_model.version = int(stored_version)
                except (TypeError, ValueError):
                    logger.warning("Unable to parse stored version for organisation %s: %r", organisation_slug, stored_version)

        cf_stack_id_write = organisation_model.upsert(table, only_set_once=[])
        if not cf_stack_id_write.success:
            logger.error(
                "Failed to persist cf_stack_id for %s (stack_id=%s): %s",
                organisation_slug,
                stack_id,
                cf_stack_id_write.error,
            )
            return make_response(
                500,
                {
                    "message": "Organisation stack was created but cf_stack_id was not persisted.",
                    "stack_id": stack_id,
                    "error": cf_stack_id_write.error,
                },
            )

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


def set_organisation_status(existing_item: dict, organisation_slug: str, status: Status) -> bool:
    try:
        model = OrganisationModel.model_validate(existing_item)
        model.organisation = organisation_slug
        model.status = status
        model.updated_at = datetime.now(timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z')

        stored_version = existing_item.get("version")
        if stored_version is not None:
            try:
                model.version = int(stored_version)
            except (TypeError, ValueError):
                logger.warning("Unable to parse version while archiving %s: %r", organisation_slug, stored_version)

        response = model.upsert(table, only_set_once=[])
        if not response.success:
            logger.error("Failed to set organisation status for %s to %s: %s", organisation_slug, status.value, response.error)
            return False
        return True
    except Exception as e:
        logger.error("Failed to set organisation status for %s to %s: %s", organisation_slug, status.value, str(e))
        logger.error(traceback.format_exc())
        return False


def mark_organisation_archived(existing_item: dict, organisation_slug: str) -> bool:
    return set_organisation_status(existing_item, organisation_slug, Status.archived)


def mark_organisation_offboarding(existing_item: dict, organisation_slug: str) -> bool:
    return set_organisation_status(existing_item, organisation_slug, Status.offboarding)


def initiate_organisation_delete(organisation_slug: str):
    normalised_slug = generateSlug(organisation_slug)
    blank_model = OrganisationModel(name="blank", organisation=normalised_slug)

    try:
        result = table.get_item(Key={"PK": blank_model.PK, "SK": blank_model.SK})
        item = result.get("Item")
    except Exception as e:
        logger.error("DynamoDB lookup failed during delete init for %s: %s", normalised_slug, e)
        return make_response(500, {"message": "Failed to look up organisation."})

    if not item:
        return make_response(404, {"message": f"Organisation '{organisation_slug}' not found."})

    stack_id = item.get("cf_stack_id")
    if not stack_id:
        return make_response(404, {"message": "No CloudFormation StackId found for this organisation."})

    try:
        describe = cloudformation.describe_stacks(StackName=stack_id)
        stack_status = describe["Stacks"][0].get("StackStatus", "")

        if stack_status == "DELETE_IN_PROGRESS":
            offboarding = mark_organisation_offboarding(item, normalised_slug)
            return make_response(202, {
                "message": "Deletion already in progress.",
                "organisation": normalised_slug,
                "stackId": stack_id,
                "offboarding": offboarding,
            })

        if stack_status == "DELETE_COMPLETE":
            archived = mark_organisation_archived(item, normalised_slug)
            return make_response(200, {
                "message": "Stack is already deleted.",
                "organisation": normalised_slug,
                "stackId": stack_id,
                "archived": archived,
            })

        cloudformation.delete_stack(StackName=stack_id)
        offboarding = mark_organisation_offboarding(item, normalised_slug)
        return make_response(202, {
            "message": "Organisation deletion initiated. CloudFormation stack teardown in progress.",
            "organisation": normalised_slug,
            "stackId": stack_id,
            "offboarding": offboarding,
        })
    except ClientError as e:
        error_code = e.response.get("Error", {}).get("Code")
        if error_code in ["AccessDenied", "AccessDeniedException"]:
            return make_response(403, {
                "message": "Not authorized to delete CloudFormation stack. Ensure role has cloudformation:DeleteStack.",
                "error": error_code,
            })
        if error_code == "ValidationError":
            archived = mark_organisation_archived(item, normalised_slug)
            return make_response(200, {
                "message": "Stack no longer exists. Marked organisation as archived.",
                "organisation": normalised_slug,
                "stackId": stack_id,
                "archived": archived,
            })
        logger.error("Unexpected CloudFormation delete error for %s: %s", normalised_slug, str(e))
        logger.error(traceback.format_exc())
        return make_response(500, {"message": "Unable to initiate organisation deletion."})

# Maps each CloudFormation StackStatus to a UI-friendly progress value.
# https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/using-cfn-describing-stacks.html
STACK_PROGRESS = {
    "CREATE_IN_PROGRESS":       {"pct": 30,  "done": False, "ok": True},
    "CREATE_COMPLETE":          {"pct": 100, "done": True,  "ok": True},
    "CREATE_FAILED":            {"pct": 100, "done": True,  "ok": False},
    "ROLLBACK_IN_PROGRESS":     {"pct": 60,  "done": False, "ok": False},
    "ROLLBACK_COMPLETE":        {"pct": 100, "done": True,  "ok": False},
    "ROLLBACK_FAILED":          {"pct": 100, "done": True,  "ok": False},
    "DELETE_IN_PROGRESS":       {"pct": 50,  "done": False, "ok": True},
    "DELETE_COMPLETE":          {"pct": 100, "done": True,  "ok": True},
    "DELETE_FAILED":            {"pct": 100, "done": True,  "ok": False},
    "UPDATE_IN_PROGRESS":       {"pct": 30,  "done": False, "ok": True},
    "UPDATE_COMPLETE":          {"pct": 100, "done": True,  "ok": True},
    "UPDATE_ROLLBACK_COMPLETE": {"pct": 100, "done": True,  "ok": False},
}


def summarise_stack_resources(stack_resources: list[dict]) -> dict:
    total = len(stack_resources)
    in_progress = 0
    failed = 0
    completed = 0

    for resource in stack_resources:
        status = str(resource.get("ResourceStatus") or "")
        if not status:
            continue

        if status.endswith("_IN_PROGRESS") or status.endswith("_PENDING"):
            in_progress += 1
            continue

        if "FAILED" in status or "ROLLBACK" in status:
            failed += 1
            continue

        completed += 1

    done = completed + failed
    progressed = completed + failed + in_progress
    pct = int((done / total) * 100) if total > 0 else 0

    return {
        "total": total,
        "completed": completed,
        "failed": failed,
        "inProgress": in_progress,
        "done": done,
        "progressed": progressed,
        "pct": max(0, min(100, pct)),
    }


def cumulative_step_progress_from_events(
    events: list[dict],
    stack_resources: list[dict],
    stack_name: str,
) -> dict:
    valid_resource_ids = {
        str(resource.get("LogicalResourceId") or "")
        for resource in stack_resources
        if resource.get("LogicalResourceId")
    }

    # User-defined model:
    # - 3 steps per resource: start, initiated, finish
    # - 2 steps for root stack: start, finish
    total_steps = (len(valid_resource_ids) * 3) + 2
    touched_steps = 0

    resource_started: set[str] = set()
    resource_initiated: set[str] = set()
    resource_finished: set[str] = set()

    stack_started = False
    stack_finished = False

    for event in events:
        logical_resource_id = str(event.get("logicalResourceId") or "")
        status = str(event.get("resourceStatus") or "")
        reason = str(event.get("statusReason") or "")

        if logical_resource_id == stack_name:
            if status.endswith("_IN_PROGRESS"):
                stack_started = True
            if status.endswith("_COMPLETE") or "FAILED" in status or "ROLLBACK" in status:
                stack_finished = True
            continue

        if not logical_resource_id or logical_resource_id not in valid_resource_ids:
            continue

        if status.endswith("_IN_PROGRESS"):
            resource_started.add(logical_resource_id)

            if "initiated" in reason.lower() or "user initiated" in reason.lower():
                resource_initiated.add(logical_resource_id)

        if status.endswith("_COMPLETE") or "FAILED" in status or "ROLLBACK" in status:
            resource_finished.add(logical_resource_id)

    touched_steps = (
        len(resource_started)
        + len(resource_initiated)
        + len(resource_finished)
        + (1 if stack_started else 0)
        + (1 if stack_finished else 0)
    )

    pct = int((touched_steps / total_steps) * 100) if total_steps > 0 else 0
    pct = max(0, min(100, pct))

    return {
        "touchedSteps": touched_steps,
        "totalSteps": total_steps,
        "pct": pct,
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

        all_events: list[dict] = []
        next_events_token = None

        while True:
            describe_events_kwargs = {"StackName": stack_id}
            if next_events_token:
                describe_events_kwargs["NextToken"] = next_events_token

            events_response = cloudformation.describe_stack_events(**describe_events_kwargs)
            all_events.extend(
                {
                    "logicalResourceId": e["LogicalResourceId"],
                    "resourceType": e["ResourceType"],
                    "resourceStatus": e["ResourceStatus"],
                    "timestamp": e["Timestamp"].isoformat(),
                    "statusReason": e.get("ResourceStatusReason"),
                }
                for e in events_response.get("StackEvents", [])
            )

            next_events_token = events_response.get("NextToken")
            if not next_events_token:
                break

        # CloudFormation returns newest-first; keep payload bounded while still
        # exposing more than just a tiny window for the UI dropdown.
        recent_events = all_events[:200]

        stack_resources = []
        next_token = None

        while True:
            describe_resources_kwargs = {"StackName": stack_id}
            if next_token:
                describe_resources_kwargs["NextToken"] = next_token

            resources_response = cloudformation.describe_stack_resources(**describe_resources_kwargs)
            stack_resources.extend(resources_response.get("StackResources", []))
            next_token = resources_response.get("NextToken")

            if not next_token:
                break
    except ClientError as e:
        if e.response["Error"]["Code"] in ["AccessDenied", "AccessDeniedException"]:
            return make_response(403, {
                "message": "Not authorized to read CloudFormation stack status. Ensure role has cloudformation:DescribeStacks, cloudformation:DescribeStackEvents and cloudformation:DescribeStackResources.",
                "error": e.response["Error"]["Code"],
            })
        if e.response["Error"]["Code"] == "ValidationError":
            archived = mark_organisation_archived(item, normalised_slug)
            return make_response(200, {
                "organisation": organisation_slug,
                "stackId": stack_id,
                "stackName": f"{STAGE_NAME}-org-{normalised_slug}",
                "stackStatus": "DELETE_COMPLETE",
                "pct": 100,
                "done": True,
                "ok": True,
                "archived": archived,
                "touchedSteps": 1,
                "totalSteps": 1,
                "resourceSummary": {
                    "total": 0,
                    "completed": 0,
                    "failed": 0,
                    "inProgress": 0,
                    "done": 0,
                    "progressed": 0,
                    "pct": 100,
                },
                "recentEvents": [],
            })
        logger.error(f"CloudFormation describe_stacks failed: {e}")
        raise

    # Exclude the root stack resource from step-based progress. Users care
    # about the actual infrastructure resources being provisioned.
    stack_name = stack.get("StackName")
    progress_resources = [
        resource for resource in stack_resources
        if not (
            resource.get("ResourceType") == "AWS::CloudFormation::Stack"
            and resource.get("LogicalResourceId") == stack_name
        )
    ]

    progress = STACK_PROGRESS.get(stack_status, {"pct": 50, "done": False, "ok": True})
    resource_summary = summarise_stack_resources(progress_resources)
    step_progress = cumulative_step_progress_from_events(all_events, progress_resources, stack_name)

    if progress["done"]:
        pct = 100
    elif resource_summary["total"] > 0:
        pct = step_progress["pct"]
    else:
        pct = 0
    done = progress["done"] or (resource_summary["total"] > 0 and resource_summary["done"] >= resource_summary["total"])
    ok = progress["ok"] and resource_summary["failed"] == 0

    archived = str(item.get("status") or "") == Status.archived.value
    if stack_status == "DELETE_COMPLETE":
        archived = mark_organisation_archived(item, normalised_slug)

    return make_response(200, {
        "organisation": organisation_slug,
        "stackId": stack_id,
        "stackName": stack["StackName"],
        "stackStatus": stack_status,
        "pct": pct,
        "done": done,
        "ok": ok,
        "archived": archived,
        "touchedSteps": step_progress["touchedSteps"],
        "totalSteps": step_progress["totalSteps"],
        "resourceSummary": resource_summary,
        "recentEvents": recent_events,
    })


def lambda_handler(event, context):
    try:
        logger.info("Received event: %s", json.dumps(event, indent=2, cls=DecimalEncoder))
        http_method  = event['requestContext']["http"]["method"]

        is_public        = event.get("rawPath", "").startswith("/public")
        actor            = event.get("requestContext", {}).get("accountId", "unknown")
        raw_path         = event.get("rawPath", "")
        path_params      = event.get("pathParameters") or {}
        organisation_id  = path_params.get("organisationId")

        # POST /organisations/{organisationId}/delete-stack
        if http_method == "POST" and raw_path.endswith("/delete-stack") and organisation_id:
            return initiate_organisation_delete(organisation_id)
        # POST /organisations
        elif http_method == "POST":
            parsed_event = parse_event(event)
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

        return make_response(405, {"message": "Method not allowed."})

    except ValueError as e:
        logger.error("Validation error: %s", str(e))
        logger.error(traceback.format_exc())
        return make_response(400,{"message": "Validation error.", "error": str(e)})
    except Exception as e:
        logger.error("Unexpected error: %s", str(e))
        logger.error(traceback.format_exc())
        return make_response(500, {"message": "Internal server error.", "error": str(e)})
    