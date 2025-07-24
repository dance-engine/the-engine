## python libraries
import os
import boto3 # not a python library but is included in lambda without need to install it
import logging
import traceback
import re

## installed packages
from pydantic import ValidationError # layer: pydantic
from boto3.dynamodb.conditions import Key
from botocore.exceptions import ClientError

## custom scripts
from _shared.helpers import make_response
from _pydantic.models.organisation_models import OrganisationObject
from _pydantic.models.models_extended import OrganisationModel

## logger setup
logger = logging.getLogger()
logger.setLevel("INFO")

## aws resources an clients
#db = boto3.resource("dynamodb")

## ENV variables
# will throw an error if the env variable does not exist
STAGE_NAME = os.environ.get('STAGE_NAME') or (_ for _ in ()).throw(KeyError("Environment variable 'STAGE_NAME' not found"))
CORE_TABLE_NAME = os.environ.get('CORE_TABLE_NAME') or (_ for _ in ()).throw(KeyError("Environment variable 'CORE_TABLE_NAME' not found"))
ORG_TABLE_NAME_TEMPLATE = os.environ.get('ORG_TABLE_NAME_TEMPLATE') or (_ for _ in ()).throw(KeyError("Environment variable 'ORG_TABLE_NAME_TEMPLATE' not found"))

## aws resources an clients
db = boto3.resource("dynamodb")
s3 = boto3.client("s3")
eventbridge    = boto3.client('events')
cloudformation = boto3.client("cloudformation")

table = db.Table(CORE_TABLE_NAME)

def splitArn(arn):
    arn_regex = re.compile(r"^arn:(?P<partition>[^:]+):(?P<service>[^:]*):(?P<region>[^:]*):(?P<account_id>[^:]*):(?P<resource>.+)$")
    match = arn_regex.match(arn)
    if match:
        return match.groupdict()
    else:
        logger.error(f"Invalid ARN: {arn}")
        return {}
    
def getOrgIdFromStackResource(resource):
    resource_regex = re.compile(r"^stack\/(?P<stage>preview|prod|dev)-org-(?P<orgId>[\w\-]+)\/[\w\-]+$")
    match = resource_regex.match(resource)
    if match:
        return match.groupdict()
    else:
        logger.error(f"Invalid Resource: {resource}")
        return {}

    
def get_organisation_settings(organisationSlug: str):
    logger.info(f"Getting settings of {organisationSlug} from {CORE_TABLE_NAME} / ")
    blank_model = OrganisationModel(name="blank", organisation=organisationSlug)

    try:
        result = blank_model.query_gsi(
            table,
            "IDXinv", 
            Key('PK').eq(f'{blank_model.PK}') & Key('SK').eq(f'{blank_model.SK}'),
            assemble_entites=True,
            )
        logger.info(f"Found settings for {organisationSlug}: {result}")
    except Exception as e:
        logger.error(f"DynamoDB query failed to get settings for {organisationSlug}: {e}")
        raise Exception

    return result, OrganisationObject.model_validate(result)

def lambda_handler(event, context):
    logger.info(f"event: {event}")
    logger.info(f"context: {context}")
    stack_id = event.get("detail", {}).get("stack-id")

    if not stack_id:
        logger.error("No stack-id found in event")
        return
    
    partition, service, region, account_id, resource = splitArn(stack_id).values()

    if not resource:
        logger.error("Failed to parse ARN and get a resource")
        return
    
    stage, organisation_slug = getOrgIdFromStackResource(resource).values()

    if not organisation_slug:
        logger.error("Failed to parse resource and get a orgId")
        return

    # Get the record from the core DB
    organisation_model, organisation_object = get_organisation_settings(organisation_slug)
    logger.info(f"Read Item {organisation_model}")

    if not organisation_model:
        logger.error(f"Couldn;t find {organisation_slug} in {CORE_TABLE_NAME}")
        return

    ORG_TABLE_NAME = ORG_TABLE_NAME_TEMPLATE.replace("org_name",organisation_slug)
    org_table = db.Table(ORG_TABLE_NAME)
    logger.info(f"Adding organisation: {organisation_slug} in {ORG_TABLE_NAME}")

    try:
        organisation_response = organisation_model.upsert(org_table,["organisation","created_at"])
        logger.info(f"Organisation item created in {org_table}: {organisation_response}")
        return
    except ClientError as e:
        if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
            logger.warning("Organisation with this name already exists: %s", organisation_slug)
            return None
        else:
            logger.error(f"Error writing organisation to {org_table}: {str(e)}")
            logger.error(traceback.format_exc())
            raise
    except ValidationError as e:
        logger.error("Invalid organisation data: %s", str(e))
        raise ValueError("Invalid organisation model")
    except Exception as e:
        logger.error("Unexpected error: %s", str(e))
        logger.error(traceback.format_exc())
        return 
    