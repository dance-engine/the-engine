import boto3
import os
import logging
from urllib.parse import urlparse

logger = logging.getLogger()
logger.setLevel("INFO")

cloudformation = boto3.client("cloudformation")
s3 = boto3.client("s3")

TEMPLATE_URL = os.environ.get("TEMPLATE_URL")  # e.g. https://bucket-name.s3.amazonaws.com/path/to/template.yaml

def create_handler(event, context):
    detail = event.get("detail", {})
    organisation_id = detail.get("OrganisationId")
    stage = detail.get("Stage", "preview")

    if not organisation_id:
        raise ValueError("Missing OrganisationId in event detail")

    stack_name = f"{stage}-customer-{organisation_id}"

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

    response = cloudformation.create_stack(
        StackName=stack_name,
        TemplateURL=signed_url,
        Parameters=[
            {"ParameterKey": "OrganisationId", "ParameterValue": organisation_id},
            {"ParameterKey": "Stage", "ParameterValue": stage},
        ],
        Capabilities=["CAPABILITY_NAMED_IAM"],
        Tags=[
            {"Key": "OrganisationId", "Value": organisation_id},
            {"Key": "Stage", "Value": stage}
        ]
    )

    logger.info(f"Created stack: {stack_name}")
    return response
