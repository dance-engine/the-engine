import json
import logging
from datetime import datetime
from enum import Enum
from typing import Optional, Dict, Any
from botocore.client import BaseClient

from pydantic import BaseModel, Field, EmailStr, model_validator #! This means all eventbridge events need models even if they dont deal with Pydantic Entities, I think it's too tightly coupled, can we pass in Pydantic if needed 

from _shared.DecimalEncoder import DecimalEncoder
from _shared.helpers import deprecated

@deprecated("Use trigger_eventbridge_event instead")
def triggerEBEvent(eventBridgeClient, source = "core", detail_type = "General", detail = {}):
    """
    DEPRECATED: Use trigger_eventbridge_event instead.
    """
    logger = logging.getLogger()
    logger.info(f"Trigger Event Bus: \n{source} \n {detail_type} \n {detail}")
    eventBridgeClient.put_events(
        Entries=[
            {
                # 'Detail': '{ "message": "Hello, EventBridge!" }',
                'Detail': json.dumps(detail, cls=DecimalEncoder),
                'DetailType': detail_type,
                'Source': f"dance-engine.{source}",
            },
        ]
    )
    return True

class EventType(str, Enum):
    event = "event"
    customer = "customer"
    organisation = "organisation"
    item = "item"
    bundle = "bundle" 


class Action(str, Enum):
    created = "created"
    updated = "updated"
    deleted = "deleted"
    restored = "restored"
    archived = "archived"
    published = "published"

class EventBridgeEventDetail(BaseModel):
    timestamp: datetime
    organisation: str
    resource_type: EventType
    resource_id: str
    action: Action
    data: dict
    meta: Optional[Dict] = Field(default_factory=dict)

class EventBridgeEvent(BaseModel):
    source: str = Field(..., description="Source service, e.g., dance-engine.core")
    detail_type: str = Field(..., description="Combination of resource + action, e.g. 'event.created'")
    detail: EventBridgeEventDetail

    @model_validator(mode="before")
    @classmethod
    def generate_detail_type(cls, values):
        detail = values.get("detail")
        if detail and isinstance(detail, dict):
            resource_type = detail.get("resource_type")
            action = detail.get("action")
            if resource_type and action:
                values["detail_type"] = f"{resource_type}.{action}"
        elif detail and hasattr(detail, "resource_type") and hasattr(detail, "action"):
            values["detail_type"] = f"{detail.resource_type.value}.{detail.action.value}"
        return values    


def trigger_eventbridge_event(
    client: BaseClient,
    *,
    source: str,
    resource_type: EventType,
    action: Action,
    organisation: str,
    resource_id: str,
    data: Optional[Dict[str, Any]] = None,
    meta: Optional[Dict[str, Any]] = None,
    timestamp: Optional[datetime] = None,
) -> bool:
    """
    Trigger an EventBridge event using typed and validated inputs.
    
    The `detail_type` is automatically generated using `{resource_type}.{action}`.

    Parameters:
    - client: Boto3 EventBridge client
    - source: Source of the event (e.g., 'dance-engine.core')
    - resource_type: Type of resource affected (e.g., EventType.event)
    - action: Action taken on the resource (e.g., Action.updated)
    - organisation: Organisation slug or identifier
    - resource_id: The resource ksuid or identifier
    - data: Any additional data relevant to the event
    - meta: Optional metadata (e.g., user_email)
    - timestamp: Optional timestamp, defaults to `datetime.utcnow()`

    Returns:
    - True if successfully published to EventBridge
    """

    logger = logging.getLogger()

    try:
        event = EventBridgeEvent(
            source=source,
            detail=EventBridgeEventDetail(
                timestamp=timestamp or datetime.utcnow(),
                organisation=organisation,
                resource_type=resource_type,
                resource_id=resource_id,
                action=action,
                data=data or {},
                meta=meta if meta else None,
            )
        )

        logger.info("Triggering EventBridge event:\n%s", event.model_dump_json(indent=2))

        response = client.put_events(
            Entries=[
                {
                    "Source": event.source,
                    "DetailType": event.detail_type,
                    "Detail": event.detail.model_dump_json(by_alias=True, exclude_unset=True),
                }
            ]
        )

        failed = response.get("FailedEntryCount", 0)
        if failed:
            logger.warning("Failed to send some EventBridge events: %s", response)
            return False

        return True

    except Exception as e:
        logger.exception("Failed to trigger EventBridge event")
        return False