import json
import logging
import boto3
from _pydantic.EventBridge import trigger_eventbridge_event, EventType, Action

logger = logging.getLogger()
logger.setLevel("INFO")

eventbridge = boto3.client("events")


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
