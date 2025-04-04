import boto3
import os
import logging
from urllib.parse import urlparse
import re
import json

import traceback
from botocore.exceptions import ClientError
from boto3.dynamodb.conditions import Key
from _shared.DecimalEncoder import DecimalEncoder

logger = logging.getLogger()
logger.setLevel("INFO")

cloudformation = boto3.client("cloudformation")
s3 = boto3.client("s3")
db = boto3.resource("dynamodb")

TEMPLATE_URL = os.environ.get("TEMPLATE_URL")  # e.g. https://bucket-name.s3.amazonaws.com/path/to/template.yaml
ORG_TABLE_NAME_TEMPLATE = os.environ.get("ORG_TABLE_NAME_TEMPLATE")
CORE_TABLE_NAME = os.environ.get("CORE_TABLE_NAME")
table = db.Table(CORE_TABLE_NAME)


def create_handler(event, context):
    detail = event.get("detail", {})
    organisation_slug = detail.get("OrganisationSlug")
    stage = detail.get("Stage", "preview")

    if not organisation_slug:
        raise ValueError("Missing OrganisationId in event detail")

    stack_name = f"{stage}-org-{organisation_slug}"

    # Parse bucket and key from TEMPLATE_URL
    if not TEMPLATE_URL:
        raise ValueError("TEMPLATE_URL environment variable is not set")

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

    logger.info(f"Using signed template URL: {signed_url}")

    try:

        response = cloudformation.create_stack(
            StackName=stack_name,
            TemplateURL=signed_url,
            Parameters=[
                {"ParameterKey": "OrganisationId", "ParameterValue": organisation_slug},
                {"ParameterKey": "Stage", "ParameterValue": stage},
            ],
            Capabilities=["CAPABILITY_NAMED_IAM"],
            Tags=[
                {"Key": "OrganisationId", "Value": organisation_slug}
            ]
        )
        logger.info(f"Created stack: {stack_name}")
    except ClientError as e:
        if e.response["Error"]["Code"] == "AlreadyExistsException":
            logger.warning(f"Stack for {organisation_slug} already exists")
        else:
            logger.error("Error creating organisation stack %s: %s", organisation_slug, str(e))
            logger.error(traceback.format_exc())
            raise

    try:
        table.put_item(Item=create_organisation(organisation_slug), ConditionExpression="attribute_not_exists(PK)")
        return response

    except ClientError as e:
            if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
                logger.warning("Organisation with this name already exists: %s", organisation_slug)
                return None
            else:
                logger.error("Error creating organisation %s: %s", organisation_slug, str(e))
                logger.error(traceback.format_exc())
                raise

def provisioned_handler(event, context): 
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
    item = getDbItem(table,createKeyFromOrgSlug(organisation_slug),createKeyFromOrgSlug(organisation_slug))
    logger.info(f"Read Item {item}")

    if not item:
        logger.error(f"Couldn;t find {createKeyFromOrgSlug(organisation_slug)} in {CORE_TABLE_NAME}")
        return

    orgTable = db.Table(ORG_TABLE_NAME_TEMPLATE.replace('org_name',organisation_slug))
    try:
        orgTable.put_item(Item=item, ConditionExpression="attribute_not_exists(PK)")
        return

    except ClientError as e:
            if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
                logger.warning("Organisation with this name already exists: %s", organisation_slug)
                return None
            else:
                logger.error("Error creating organisation %s: %s", organisation_slug, str(e))
                logger.error(traceback.format_exc())
                raise

def public_handler(event, context):
    logger.info(f"Get Organisations: {event}")
    orgItems = getOrgItems()
    return {"statusCode": 200, "body": json.dumps(orgItems, cls=DecimalEncoder)}

def splitArn(arn):
    arn_regex = re.compile(r"^arn:(?P<partition>[^:]+):(?P<service>[^:]*):(?P<region>[^:]*):(?P<account_id>[^:]*):(?P<resource>.+)$")
    match = arn_regex.match(arn)
    if match:
        return match.groupdict()
    else:
        logger.error(f"Invalid ARN: {arn}")
        return {}
    
def getOrgIdFromStackResource(resource):
    resource_regex = re.compile(r"^stack\/(?P<stage>preview|prod|dev)-org-(?P<orgId>demo)\/(?:[\d\w\-]*)$")
    match = resource_regex.match(resource)
    if match:
        return match.groupdict()
    else:
        logger.error(f"Invalid Resource: {resource}")
        return [None,None]
    
def create_organisation(orgSlug):
    org = {
        "PK": createKeyFromOrgSlug(orgSlug),
        "SK": createKeyFromOrgSlug(orgSlug),
        "type": f"ORGANISATION",
        "org-slug": f"{orgSlug}"
    }
    return org

def createKeyFromOrgSlug(orgSlug):
    return f"ORGANISATION#{orgSlug}"

def getDbItem(table, pk, sk):
    return table.get_item(Key={"PK": pk, "SK": sk}).get("Item")

def getOrgItems():
    response = table.query(
        IndexName= 'typeIDX',
        KeyConditionExpression=Key('type').eq('ORGANISATION') & Key('PK').begins_with('ORGANISATION#')
    )
    return response.get("Items")