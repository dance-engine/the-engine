import json
import os
import logging
import time
import boto3
from botocore.exceptions import ClientError
from urllib.parse import urlparse
from _pydantic.EventBridge import trigger_eventbridge_event, EventType, Action

logger = logging.getLogger()
logger.setLevel("INFO")

eventbridge = boto3.client("events")
s3 = boto3.client("s3")

BUCKET_NAME = os.environ.get("BUCKET_NAME", "")

METADATA_UPDATE_MAX_RETRIES = 4
METADATA_UPDATE_BASE_DELAY_SECONDS = 0.05


def _json_response(status_code, body):
    return {
        "statusCode": status_code,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(body),
    }


def _metadata_entry_matches_file(entry_file: str, file_key: str) -> bool:
    if not isinstance(entry_file, str) or not entry_file:
        return False

    normalized_entry = entry_file.rstrip("/")
    normalized_key = file_key.rstrip("/")
    normalized_key_path = normalized_key.removeprefix("cdn/")
    cdn_url = os.environ.get("CDN_URL", "").rstrip("/")

    if normalized_entry == normalized_key:
        return True

    if cdn_url and normalized_key.startswith("cdn/"):
        normalized_cdn_url = f"{cdn_url}/{normalized_key_path}"
        if normalized_entry == normalized_cdn_url:
            return True

    parsed_entry = urlparse(normalized_entry)
    if parsed_entry.scheme and parsed_entry.netloc:
        entry_path = parsed_entry.path.lstrip("/")
        if entry_path == normalized_key_path:
            return True
        if entry_path.endswith(f"/{normalized_key_path}"):
            return True

    return normalized_entry.endswith(f"/{normalized_key_path}")


def _remove_file_from_metadata_with_retry(
    bucket_name: str,
    metadata_key: str,
    file_key: str,
    max_retries: int = METADATA_UPDATE_MAX_RETRIES,
) -> bool:
    for attempt in range(1, max_retries + 1):
        try:
            response = s3.get_object(Bucket=bucket_name, Key=metadata_key)
        except s3.exceptions.NoSuchKey:
            # Nothing to update.
            return True

        etag = (response.get("ETag") or "").strip('"')
        metadata = json.loads(response["Body"].read().decode("utf-8"))
        if not isinstance(metadata, list):
            metadata = []

        updated_metadata = [
            entry for entry in metadata
            if not _metadata_entry_matches_file(entry.get("file"), file_key)
        ]

        # Already removed by another request; treat as success.
        if len(updated_metadata) == len(metadata):
            return True

        put_kwargs = {
            "Bucket": bucket_name,
            "Key": metadata_key,
            "Body": json.dumps(updated_metadata).encode("utf-8"),
            "ContentType": "application/json",
            "CacheControl": "no-cache, no-store, must-revalidate",
        }
        if etag:
            put_kwargs["IfMatch"] = etag

        try:
            s3.put_object(**put_kwargs)
            return True
        except ClientError as exc:
            error = exc.response.get("Error", {})
            error_code = error.get("Code")
            status_code = exc.response.get("ResponseMetadata", {}).get("HTTPStatusCode")
            is_conflict = error_code in {"PreconditionFailed", "ConditionalRequestConflict"} or status_code == 412

            if is_conflict and attempt < max_retries:
                delay = min(0.5, METADATA_UPDATE_BASE_DELAY_SECONDS * (2 ** (attempt - 1)))
                time.sleep(delay)
                continue

            if is_conflict:
                logger.warning(
                    "Metadata update conflict persisted after %s attempts for %s",
                    max_retries,
                    metadata_key,
                )
                return False

            raise

    return False


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
        metadata_updated = _remove_file_from_metadata_with_retry(
            bucket_name=BUCKET_NAME,
            metadata_key=metadata_key,
            file_key=file_key,
        )
        if not metadata_updated:
            return _json_response(409, {"message": "Metadata update conflict, please retry"})

        return _json_response(200, {"message": "Photo deleted successfully"})

    except json.JSONDecodeError:
        return _json_response(400, {"message": "Invalid JSON body"})
    except Exception as exc:
        logger.exception("Failed to delete event photo")
        return _json_response(500, {"message": "Failed to delete event photo", "error": str(exc)})
