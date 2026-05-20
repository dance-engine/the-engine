import json
import os
import logging
import boto3
from _pydantic.EventBridge import trigger_eventbridge_event, EventType, Action

logger = logging.getLogger()
logger.setLevel("INFO")

eventbridge = boto3.client("events")
s3 = boto3.client("s3")

BUCKET_NAME = os.environ.get("BUCKET_NAME", "")


def _json_response(status_code, body):
    return {
        "statusCode": status_code,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(body),
    }


def trigger_upload_processing(event, context):
    try:
        organisation = (event.get("pathParameters") or {}).get("organisation")
        if not organisation:
            return _json_response(400, {"message": "Missing organisation path parameter"})

        payload = json.loads(event.get("body") or "{}")

        # Allow callers to pass either `media` directly or a generic payload.
        media_payload = payload.get("media") if isinstance(payload.get("media"), dict) else payload
        if not isinstance(media_payload, dict):
            return _json_response(400, {"message": "Body must be a JSON object"})

        media_payload.setdefault("organisation", organisation)

        event_ksuid = payload.get("event_ksuid") or media_payload.get("event_ksuid")
        if event_ksuid:
            media_payload["event_ksuid"] = event_ksuid

        resource_id = (
            payload.get("resource_id")
            or media_payload.get("PK")
            or media_payload.get("SK")
            or event_ksuid
            or "media"
        )

        account_id = payload.get("accountId") or "unknown"
        meta = payload.get("meta") if isinstance(payload.get("meta"), dict) else {}
        meta.setdefault("accountId", account_id)
        meta.setdefault("trigger", "media-upload-finalize")

        queued = trigger_eventbridge_event(
            eventbridge,
            source="dance-engine.core",
            resource_type=EventType.media,
            action=Action.completed,
            organisation=organisation,
            resource_id=resource_id,
            data={"media": {"Attributes": media_payload}},
            meta=meta,
        )

        status_code = 202 if queued else 500
        return _json_response(
            status_code,
            {
                "message": "Upload processing event queued" if queued else "Failed to queue upload processing event",
                "queued": queued,
                "detail_type": "media.completed",
                "resource_id": resource_id,
            },
        )
    except json.JSONDecodeError:
        return _json_response(400, {"message": "Invalid JSON body"})
    except Exception as exc:
        logger.exception("Failed to trigger upload processing event")
        return _json_response(500, {"message": "Failed to trigger upload processing event", "error": str(exc)})


def delete_event_photo(event, context):
    try:
        params = event.get("pathParameters") or {}
        organisation = params.get("organisation")
        event_ksuid = params.get("ksuid")

        if not organisation or not event_ksuid:
            return _json_response(400, {"message": "Missing organisation or event ksuid"})

        payload = json.loads(event.get("body") or "{}")
        file_key = payload.get("file")

        if not file_key:
            return _json_response(400, {"message": "Missing 'file' in request body"})

        # Validate the key is scoped to this org/event to prevent arbitrary deletion
        expected_prefix = f"cdn/{organisation}/event/{event_ksuid}/photos/"
        if not file_key.startswith(expected_prefix):
            return _json_response(403, {"message": "Forbidden: file key does not match event path"})

        if not BUCKET_NAME:
            return _json_response(500, {"message": "BUCKET_NAME not configured"})

        # Delete the photo from S3
        s3.delete_object(Bucket=BUCKET_NAME, Key=file_key)

        # Remove entry from metadata.json
        metadata_key = f"cdn/{organisation}/event/{event_ksuid}/photos/metadata.json"
        try:
            response = s3.get_object(Bucket=BUCKET_NAME, Key=metadata_key)
            metadata = json.loads(response["Body"].read().decode("utf-8"))
            if isinstance(metadata, list):
                metadata = [e for e in metadata if e.get("file") != file_key]
            else:
                metadata = []
            s3.put_object(
                Bucket=BUCKET_NAME,
                Key=metadata_key,
                Body=json.dumps(metadata).encode("utf-8"),
                ContentType="application/json",
                CacheControl="no-cache, no-store, must-revalidate",
            )
        except s3.exceptions.NoSuchKey:
            pass

        return _json_response(200, {"message": "Photo deleted successfully"})

    except json.JSONDecodeError:
        return _json_response(400, {"message": "Invalid JSON body"})
    except Exception as exc:
        logger.exception("Failed to delete event photo")
        return _json_response(500, {"message": "Failed to delete event photo", "error": str(exc)})
