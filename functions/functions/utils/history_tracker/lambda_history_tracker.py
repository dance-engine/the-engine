import os
import json
import boto3 
import logging

from pydanticde.dynamodb import HistoryModel, convert_floats_to_decimals # pydantic layer
from pydanticde.EventBridge import EventBridgeEvent, Action, EventType, EventBridgeEventDetail # pydantic layer

from _shared.DecimalEncoder import DecimalEncoder

logger = logging.getLogger()
logger.setLevel("INFO")

db = boto3.resource("dynamodb")

ORG_TABLE_NAME_TEMPLATE = os.environ.get('ORG_TABLE_NAME_TEMPLATE') or (_ for _ in ()).throw(KeyError("Environment variable 'ORG_TABLE_NAME_TEMPLATE' not found"))

def put_history_item(event: EventBridgeEvent) -> dict:
    organisation_slug = event.detail.organisation

    TABLE_NAME = ORG_TABLE_NAME_TEMPLATE.replace("org_name",organisation_slug)
    table = db.Table(TABLE_NAME)

    history = HistoryModel(
        organisation=organisation_slug,
        resource_type=event.detail.resource_type,
        resource_id=event.detail.resource_id,
        action=event.detail.action,
        timestamp=event.detail.timestamp,
        actor=event.detail.meta.get("accountId") if event.detail.meta else None,
        data=event.detail.data,
        meta=event.detail.meta if event.detail.meta else None
    )

    table.put_item(Item=convert_floats_to_decimals(history.to_dynamo(exclude_keys=False)))
    logger.info(f"History entry created for {history.resource_type}.{history.action}: {history.PK}")

    return {
        "statusCode": 200,
        "body": json.dumps({"message": "History item created successfully."})
    }

def lambda_handler(event, context):
    try:
        logger.info("Received event: %s", json.dumps(event, indent=2, cls=DecimalEncoder))
        return put_history_item(EventBridgeEvent(
            source=event.get("source", "unknown"),
            detail_type=event.get("detail-type", ""),
            detail=EventBridgeEventDetail.model_validate(event.get("detail"))
        ))

    except Exception as e:
        logger.error("Failed to process history item: %s", str(e), exc_info=True)
        return {
            "statusCode": 500,
            "body": json.dumps({"message": "Failed to write history item", "error": str(e)})
        }



