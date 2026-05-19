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

    event_ksuid = entity.get("event_ksuid") if isinstance(entity, dict) else None
    if not event_ksuid:
        event_ksuid = details.get("event_ksuid")
    if not event_ksuid and resource_type == "event":
        event_ksuid = entity.get("ksuid") if isinstance(entity, dict) else None

    # Copyfile & Delete Files
    new_files = move_and_cleanup_uploaded_files(entity, organisationSlug, event_ksuid)
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


def move_and_cleanup_uploaded_files(detail, organisationSlug, eventKsuid=None):
    logger.info(j({"msg":"Move files","detail": detail, "organisationSlug": organisationSlug, "eventKsuid": eventKsuid}))
    CDN_URL = os.environ["CDN_URL"]
    prefix = f"uploads/{organisationSlug}/"

    moved_files = []

    for key, value in detail.items():
        if isinstance(value, str) and value.startswith(prefix):
            logger.info(j({"msg":"Copying file","file": value}))

            new_key = build_cdn_key(value, prefix, organisationSlug, eventKsuid)
            # Move file
            s3.copy_object(
                Bucket=BUCKET_NAME,
                CopySource={'Bucket': BUCKET_NAME, 'Key': value},
                Key=new_key
            )
            s3.delete_object(Bucket=BUCKET_NAME, Key=value)
            url = f"{CDN_URL}/{new_key.replace('cdn/','')}"
            moved_files.append([key, url])
        
        elif isinstance(value, list):
            # Handle arrays of file paths
            moved_urls = []
            for item in value:
                if isinstance(item, str) and item.startswith(prefix):
                    logger.info(j({"msg":"Copying file from array","file": item}))
                    
                    new_key = build_cdn_key(item, prefix, organisationSlug, eventKsuid)
                    # Move file
                    s3.copy_object(
                        Bucket=BUCKET_NAME,
                        CopySource={'Bucket': BUCKET_NAME, 'Key': item},
                        Key=new_key
                    )
                    s3.delete_object(Bucket=BUCKET_NAME, Key=item)
                    url = f"{CDN_URL}/{new_key.replace('cdn/','')}"
                    moved_urls.append(url)
                else:
                    # Keep non-upload items as-is
                    moved_urls.append(item)
            
            if moved_urls:
                moved_files.append([key, moved_urls])

    # Optional: delete any leftover files in uploads/org/* not used
    cleanup_unused_uploads(prefix, keep_keys=[f for f, _ in moved_files])

    return moved_files


def build_cdn_key(source_key, prefix, organisationSlug, eventKsuid=None):
    relative_key = source_key.removeprefix(prefix)

    if eventKsuid:
        file_name = relative_key.split("/")[-1]
        return f"cdn/{organisationSlug}/event/{eventKsuid}/photos/{file_name}"

    return f"cdn/{organisationSlug}/{relative_key}"

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