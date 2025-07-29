import re
from typing import Dict, Any, Union, Literal, Optional
from botocore.exceptions import ClientError
import logging
from datetime import datetime, timezone
import traceback
from decimal import Decimal

from pydantic import BaseModel, field_validator, Field
from ksuid import KsuidMs

from _pydantic.EventBridge import Action, EventType

logger = logging.getLogger()
logger.setLevel("INFO")

def convert_datetime_to_iso_8601_with_z_suffix(dt: Union[datetime, str]) -> str:
    try:
        if isinstance(dt, str):
            dt = datetime.fromisoformat(dt.replace("Z", "+00:00"))
        return dt.strftime('%Y-%m-%dT%H:%M:%SZ')
    except Exception as e:
        raise ValueError(f"Invalid input for datetime conversion: {dt!r}. Error: {e}")


def convert_floats_to_decimals(obj: Any) -> Any:
    if isinstance(obj, float):
        return Decimal(str(obj))
    elif isinstance(obj, dict):
        return {k: convert_floats_to_decimals(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_floats_to_decimals(i) for i in obj]
    else:
        return obj

class DynamoModel(BaseModel):
    class Config:
        json_encoders = {
            datetime: convert_datetime_to_iso_8601_with_z_suffix
        }

    @field_validator("ksuid", mode="before", check_fields=False)
    @classmethod
    def validate_ksuid(cls, v):
        if v is not None:
            try:
                KsuidMs.from_base62(v)
            except Exception:
                raise ValueError("Invalid KSUID")
        return v

    @property
    def related_entities(self) -> dict:
        return {}

    @property
    def entity_type(self) -> str:
        raise NotImplementedError()
    
    @property
    def PK(self) -> str:
        raise NotImplementedError()

    @property
    def SK(self) -> str:
        raise NotImplementedError()

    @property
    def gsi1PK(self) -> str:
        raise NotImplementedError()

    @property
    def gsi1SK(self) -> str:
        raise NotImplementedError()
    
    def query_gsi(self, table, key_condition, index_name=None, filter_expression=None, assemble_entites=False) -> list:
        try:
            kwargs = {
                "KeyConditionExpression":key_condition
            }
            if index_name:
                kwargs["IndexName"] = index_name
            if filter_expression:
                kwargs["FilterExpression"] = filter_expression
            
            logger.info(f"query kwargs: {kwargs}")
            
            response = table.query(**kwargs)
            items = response.get("Items", None)
            
            logger.info(f"Fetched {len(items)} from dynamodb: {items}")
            if assemble_entites:
                return self.assemble_from_items(items)
            else:
                return [self.model_validate(item) for item in items] if len(items) > 1 else self.model_validate(items[0])
        except Exception as e:
            logger.error("Query failed: %s", str(e), exc_info=True)
            raise
    
    def _slugify(self, string) -> str:
        return re.sub(r'[^a-zA-Z0-9]+', '-', string.strip().lower()).strip('-')
    
    def uses_versioning(self) -> bool:
        return hasattr(self, "version")

    def to_dynamo(self, exclude_keys=True) -> dict:
        base = self.model_dump(mode="json", exclude_none=True)

        if exclude_keys:
            exclude_props = {"__fields_set__", "model_fields_set", "model_extra", "related_entities", "PK", "SK"}
        else:
            exclude_props = {"__fields_set__", "model_fields_set", "model_extra", "related_entities"}

        props = {}
        for name in dir(self.__class__):
            if name in exclude_props:
                continue
            attr = getattr(self.__class__, name)
            if isinstance(attr, property):
                try:
                    value = getattr(self, name)
                    if value is not None:
                        props[name] = value
                except NotImplementedError:
                    continue

        return convert_floats_to_decimals({**base, **props})
    
    def upsert(self, table, only_set_once: list = [], condition_expression: str = None):
        update_parts = []
        expression_attr_names = {}
        expression_attr_values = {}
        
        item = self.to_dynamo()

        if self.uses_versioning():
            incoming_version = item.get('version', 0)
            item['version'] = incoming_version + 1
        
        for key, value in item.items():
            name_placeholder = f"#{key}"
            value_placeholder = f":{key}"
            expression_attr_names[name_placeholder] = key
            expression_attr_values[value_placeholder] = value        

            if key in only_set_once:
                update_parts.append(f"{name_placeholder} = if_not_exists({name_placeholder}, {value_placeholder})")
            else:
                update_parts.append(f"{name_placeholder} = {value_placeholder}")

        update_expression = "SET " + ", ".join(update_parts)

        kwargs = dict(
            Key={"PK": self.PK, "SK": self.SK},
            UpdateExpression=update_expression,
            ExpressionAttributeNames=expression_attr_names,
            ExpressionAttributeValues=expression_attr_values,
            ReturnValues="ALL_NEW"
        )

        conditions = []
        
        if self.uses_versioning():
            expression_attr_names["#version"] = "version"
            expression_attr_values[":incoming_version"] = incoming_version
            conditions.append("attribute_not_exists(#version) OR #version <= :incoming_version")
        if condition_expression:
            conditions.append(f"{condition_expression}")
        
        if conditions:
            kwargs["ConditionExpression"] = " AND ".join(conditions)

        try:
            return table.update_item(**kwargs)
        except table.meta.client.exceptions.ConditionalCheckFailedException as e:
            if self.uses_versioning():
                raise VersionConflictError(self, expression_attr_values.get(":incoming_version"))
            raise
        except Exception as e:
            logger.error(traceback.format_exc())
            raise

    def assemble_from_items(self, items: list[dict]) -> "DynamoModel":
        root_entity_type = self.entity_type
        root_item = None
        for item in items:
            if item.get("entity_type") == root_entity_type:
                root_item = item
                break
        
        if not root_item:
            raise ValueError(f"No {root_entity_type} item found in items.")
        
        base = self.model_validate(root_item)

        mapping = self.related_entities
        for item in items:
            etype = item.get("entity_type")
            if etype == root_entity_type:
                continue

            if etype not in mapping:
                continue

            attr, mode, ModelClass = mapping[etype]
            parsed = ModelClass.model_validate(item)

            if mode == "single":
                setattr(base, attr, parsed)
            elif mode == "list":
                current = getattr(base, attr) or []
                current.append(parsed)
                setattr(base, attr, current)
            else:
                raise ValueError(f"Unknown mode {mode} for {etype}")
            
        return base

class VersionConflictError(Exception):
    def __init__(self, model: DynamoModel | list[DynamoModel], incoming_version: int | list[int] = None):
        if isinstance(model, list):
            self.models = model
        else:
            self.models = [model]

        if isinstance(incoming_version, list):
            self.incoming_versions = incoming_version
        else:
            self.incoming_versions = [incoming_version] * len(self.models)

        self.model = self.models[0]
        self.incoming_version = self.incoming_versions[0]
        
        messages = [
            f"{m.PK} / v{v}" if v is not None else f"{m.PK} / unknown version"
            for m, v in zip(self.models, self.incoming_versions)
        ]
        
        super().__init__(f"Version conflict on: {', '.join(messages)}")

class HistoryModel(DynamoModel):
    ksuid: str = Field(default_factory=lambda: str(KsuidMs()))
    organisation: str
    resource_type: EventType
    resource_id: str
    action: Action
    timestamp: datetime #= Field(default_factory=datetime.now(timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z'))
    actor: Optional[str] = None  # Email or ID
    data: Optional[Dict[str, Any]] = None  # Snapshot or diff
    meta: Optional[Dict[str, Any]] = None  # Optional context
    
    @property
    def entity_type(self): return "HISTORY"

    @property
    def PK(self) -> str:
        return f"HISTORY#{self.ksuid}"

    @property
    def SK(self) -> str:
        return f"{self.resource_id}"

    @property
    def gsi1PK(self) -> str:
        return None
    @property
    def gsi1SK(self) -> str:
        return None

def batch_write(table, items: list, overwrite: bool = True):
    """
    
    """
    MAX_BATCH_SIZE = 25 # DynamoDB's maximum batch size is 25 items (stricly enforced)
    client = table.meta.client
    table_name = table.name

    batches = [items[i:i+MAX_BATCH_SIZE] for i in range(0, len(items), MAX_BATCH_SIZE)]
    successful_items = []
    unprocessed_items = []

    for batch in batches:
        request_items = {
            table_name: [
                {"PutRequest": {"Item": item.to_dynamo(exclude_keys=False)}} for item in batch
            ]
        } 
        logger.info(f"Batch write request for {len(batch)} items to {table_name} with request items: {request_items}")

        try:
            response = client.batch_write_item(RequestItems=request_items)
            unprocessed = response.get('UnprocessedItems', {}).get(table_name, [])

            unprocessed_dynamo = {frozenset(entry["PutRequest"]["Item"].items()): entry for entry in unprocessed}
            unprocessed_set = set(unprocessed_dynamo.keys())

            for item in batch:
                dynamo_item = item.to_dynamo()
                if frozenset(dynamo_item) in unprocessed_set:
                    unprocessed_items.append(item)
                else:
                    successful_items.append(item)
        except ClientError as e:
            logger.error(f"Batch write failed: {e}")
            raise Exception(e)
        
    return successful_items, unprocessed_items

def transact_upsert(table, items: list[DynamoModel], only_set_once: list = [], condition_expression: str = None):
    MAX_BATCH_SIZE = 25 # DynamoDB's maximum batch size is 25 items (stricly enforced)
    client = table.meta.client

    batches = [items[i:i+MAX_BATCH_SIZE] for i in range(0, len(items), MAX_BATCH_SIZE)]
    successful_items = []
    failed_items = []

    for batch in batches:
        transact_items = []

        for item in batch:
            conditions = []
            update_parts = []
            expression_attr_names = {}
            expression_attr_values = {}

            item_dict = item.to_dynamo(exclude_keys=False)

            if item.uses_versioning():
                incoming_version = item_dict.get('version', 0)
                item_dict['version'] = incoming_version + 1

                expression_attr_names["#version"] = "version"
                expression_attr_values[":incoming_version"] = incoming_version
                conditions.append("attribute_not_exists(#version) OR #version <= :incoming_version")
            if condition_expression:
                conditions.append(f"{condition_expression}")

            for key, value in item_dict.items():
                name_placeholder = f"#{key}"
                value_placeholder = f":{key}"
                expression_attr_names[name_placeholder] = key
                expression_attr_values[value_placeholder] = value

                if key in only_set_once:
                    update_parts.append(f"{name_placeholder} = if_not_exists({name_placeholder}, {value_placeholder})")
                else:
                    update_parts.append(f"{name_placeholder} = {value_placeholder}")

            update_expression = "SET " + ", ".join(update_parts)

            transact_items.append({
                "Update": {
                    "TableName": table.name,
                    "Key": {"PK": item.PK, "SK": item.SK},
                    "UpdateExpression": update_expression,
                    "ExpressionAttributeNames": expression_attr_names,
                    "ExpressionAttributeValues": expression_attr_values,
                    "ReturnValuesOnConditionCheckFailure": "ALL_OLD",
                    **({"ConditionExpression": " AND ".join(conditions)} if conditions else {})
                }
            })

        try:
            client.transact_write_items(TransactItems=transact_items, ReturnCancellationReasons=True)
            successful_items.extend(batch)
        except client.exceptions.TransactionCanceledException as e:
            logger.warning("Transaction cancelled")
            reasons = e.response.get("CancellationReasons", [])
            conflict_idxs = [
                idx for idx, reason in enumerate(reasons)
                if reason.get("Code") == "ConditionalCheckFailed"
            ]
            if conflict_idxs:
                conflict_models = [batch[i] for i in conflict_idxs]
                conflict_versions = [
                    batch[i].version for i in conflict_idxs if batch[i].uses_versioning()
                ]

                raise VersionConflictError(conflict_models, conflict_versions)

            logger.warning("Transaction cancelled for unknown reasons: %s", reasons)
            failed_items.extend(batch)
        except Exception as e:
            logger.error(f"Unexpected transaction error: {e}")
            logger.error(traceback.format_exc())
            failed_items.extend(batch)

    return successful_items, failed_items
