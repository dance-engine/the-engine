import os
import json
import boto3
import uuid
import mimetypes
import logging
from _shared.naming import getOrganisationTableName

logger = logging.getLogger()
logger.setLevel("INFO")

BUCKET_NAME = os.environ["BUCKET_NAME"]

s3 = boto3.client("s3")
db = boto3.resource("dynamodb")

def generate_presigned_url(event, context):
    try:
        data = json.loads(event["body"])
        action = data.get("action", "upload")  # Determines upload or download
        file_key = data.get("fileKey", "")
        data["organisation"] = event.get("pathParameters", {}).get("organisation","unknown")

        if action == "POST":
            return generate_presigned_post(data)

        elif action == "GET":
            return generate_presigned_get(file_key)

        else:
            return {"statusCode": 400, "body": json.dumps({"error": "Invalid action"})}

    except Exception as e:
        return {"statusCode": 500, "body": json.dumps({"error": str(e)})}

def generate_presigned_post(data):
    """Generate a presigned URL for file upload."""
    file_type = data.get("fileType", "image/jpeg")
    extension = mimetypes.guess_extension(file_type)
    field_name = data.get("fieldName", "")
    organisation = data.get("organisation", "unknown")

    key = f"uploads/{organisation}/{field_name}/{uuid.uuid4()}{extension}"

    presigned_post = s3.generate_presigned_post(
        Bucket=BUCKET_NAME,
        Key=key,
        Fields={"Content-Type": file_type},
        Conditions=[{"Content-Type": file_type}],
        ExpiresIn=3600,  # URL valid for 1 hour
    )

    return {
        "statusCode": 200,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps({
            "url": presigned_post["url"],
            "fields": presigned_post["fields"],
            "fileKey": key  # Send back the file key
        }),
    }

def generate_presigned_get(file_key):
    """Generate a presigned URL for file retrieval."""
    logger.warning(f"Generate presigned URL for: {file_key}")
    if not file_key:
        logger.warning(f"No fileKey sent: {file_key}")
        return {"statusCode": 400, "body": json.dumps({"error": "Missing fileKey"})}

    presigned_url = s3.generate_presigned_url(
        "get_object",
        Params={"Bucket": BUCKET_NAME, "Key": file_key},
        ExpiresIn=3600,  # URL valid for 1 hour
    )

    return {
        "statusCode": 200,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps({"presignedUrl": presigned_url}),
    }

def move_upload(event,context):
    details = event.get("detail",{}).get("Attributes", {})
    logger.info(f"Move Upload Event: {details}")
    organisationSlug = details.get("organisation")

    # Copyfile & Delete Files
    new_files = move_and_cleanup_uploaded_files(details,organisationSlug)
    logger.info(f"Move files {new_files}")

    # Update name
    response = update_dynamodb_paths(details.get("PK"),details.get("SK"),new_files,organisationSlug)
    logger.info(f"DynamoDB {response}")
    # Invalidate CDN?

    return True


def move_and_cleanup_uploaded_files(detail,organisationSlug):
    CDN_URL = os.environ["CDN_URL"]
    prefix = f"uploads/{organisationSlug}/"
    cdn_prefix = f"cdn/{organisationSlug}/"

    moved_files = []

    for key, value in detail.items():
        if isinstance(value, str) and value.startswith(prefix):
            filename = value.split("/")[-1]
            new_key = value.replace(prefix, cdn_prefix)
            # new_key = f"{cdn_prefix}"
            # Move file
            s3.copy_object(
                Bucket=BUCKET_NAME,
                CopySource={'Bucket': BUCKET_NAME, 'Key': value},
                Key=new_key
            )
            s3.delete_object(Bucket=BUCKET_NAME, Key=value)
            url = f"{CDN_URL}/{new_key.replace('cdn/','')}"
            moved_files.append([key, url])

    # Optional: delete any leftover files in uploads/org/* not used
    cleanup_unused_uploads(prefix, keep_keys=[f for f, _ in moved_files])

    return moved_files

def cleanup_unused_uploads(prefix, keep_keys):
    paginator = s3.get_paginator('list_objects_v2')
    for page in paginator.paginate(Bucket=BUCKET_NAME, Prefix=prefix):
        for obj in page.get('Contents', []):
            key = obj['Key']
            if key not in keep_keys:
                s3.delete_object(Bucket=BUCKET_NAME, Key=key)

def update_dynamodb_paths(pk, sk, moved_files, organisationSlug):
    table = db.Table(getOrganisationTableName(organisationSlug))

    if not moved_files:
        return

    update_expr = "SET " + ", ".join(f"#{m[0]} = :{m[0]}" for m in moved_files)
    attr_names = {f"#{m[0]}": m[0] for m in moved_files}
    attr_values = {f":{m[0]}": m[1] for m in moved_files}

    response = table.update_item(
        Key={'PK': pk, 'SK': sk},
        UpdateExpression=update_expr,
        ExpressionAttributeNames=attr_names,
        ExpressionAttributeValues=attr_values,
        ReturnValues="ALL_NEW"
    )

    return response['Attributes']