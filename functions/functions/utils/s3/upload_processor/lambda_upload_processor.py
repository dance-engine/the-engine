import os
import json
import boto3
import uuid
import mimetypes
import logging
from _shared.naming import getOrganisationTableName
# from _pydantic.EventBridge import trigger_eventbridge_event, EventType, Action

logger = logging.getLogger()
logger.setLevel("INFO")

BUCKET_NAME = os.environ["BUCKET_NAME"]

s3 = boto3.client("s3")
db = boto3.resource("dynamodb")
eventbridge = boto3.client('events')

def j(obj) -> str:
    return json.dumps(obj, separators=(",", ":"), default=str)

def move_upload(event,context):
    logger.info(j({"msg":"Source Event","event": event}))

    details = event.get("detail",{})
    logger.info(j({"msg":"Move Upload Event","details": details}))

    organisationSlug = details.get("organisation")
    resource_type = details.get("resource_type")
    entity = details.get("data").get(resource_type) if resource_type else details
    entity = entity.get("Attributes") if entity.get("Attributes") else entity

    logger.info(j({"msg":"Entity Extracted","entity": entity}))

    organisationSlug = organisationSlug if organisationSlug else entity.get("organisation")

    # Copyfile & Delete Files
    new_files = move_and_cleanup_uploaded_files(entity,organisationSlug)
    logger.info(j({"msg":"Move files","new_files": new_files}))

    # Get an identifier
    PK = entity.get("PK") if entity.get("PK") else details.get("resource_id")
    SK = entity.get("SK") if entity.get("SK") else details.get("resource_id")

    # # Update name
    response = update_dynamodb_paths(PK, SK, new_files, organisationSlug)
    logger.info(j({"msg":"DynamoDB Response","response": response}))
    # Invalidate CDN?

    # Trigger EventBridge
    # trigger_eventbridge_event(eventbridge, 
    #                               source="dance-engine.core", 
    #                               resource_type=EventType.organisation,
    #                               action=Action.updated,
    #                               organisation=organisationSlug,
    #                               resource_id=details.get("resource_id"),
    #                               data=entity,
    #                               meta={"accountId":"system.fileuploader"},)

    return True


def move_and_cleanup_uploaded_files(detail,organisationSlug):
    logger.info(j({"msg":"Move files","detail": detail, "organisationSlug": organisationSlug}))
    CDN_URL = os.environ["CDN_URL"]
    prefix = f"uploads/{organisationSlug}/"
    cdn_prefix = f"cdn/{organisationSlug}/"

    moved_files = []

    for key, value in detail.items():
        if isinstance(value, str) and value.startswith(prefix):
            logger.info(j({"msg":"Copying file","file": value}))

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
    logger.info(j({"msg":"Updating DynamoDB","pk": pk, "sk": sk, "organisationSlug": organisationSlug, "moved_files": moved_files}))

    org_table = db.Table(getOrganisationTableName(organisationSlug))
    core_table = db.Table(os.environ["CORE_TABLE_NAME"])

    if not moved_files:
        return

    update_expr = "SET " + ", ".join(f"#{m[0]} = :{m[0]}" for m in moved_files)
    attr_names = {f"#{m[0]}": m[0] for m in moved_files}
    attr_values = {f":{m[0]}": m[1] for m in moved_files}

    org_response = org_table.update_item(
        Key={'PK': pk, 'SK': sk},
        UpdateExpression=update_expr,
        ExpressionAttributeNames=attr_names,
        ExpressionAttributeValues=attr_values,
        ReturnValues="ALL_NEW"
    )

    core_response = core_table.update_item(
        Key={'PK': pk, 'SK': sk},
        UpdateExpression=update_expr,
        ExpressionAttributeNames=attr_names,
        ExpressionAttributeValues=attr_values,
        ReturnValues="ALL_NEW"
    )

    return {"org": org_response['Attributes'], "core": core_response['Attributes']}