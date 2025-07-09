import re
from typing import Dict, Any, Union, Literal, Optional
from botocore.exceptions import ClientError
import logging
from datetime import datetime, timezone
import traceback
from decimal import Decimal

from pydantic import BaseModel, field_validator, Field
from ksuid import KsuidMs

from _shared.EventBridge import Action, EventType

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
    
    def query_gsi(self, table, index_name, key_condition, filter_expression=None, assemble_entites=False) -> list:
        try:
            kwargs = {
                "IndexName": index_name,
                "KeyConditionExpression":key_condition
            }
            if filter_expression:
                kwargs["FilterExpression"] = filter_expression
            
            logger.info(f"query kwargs: {kwargs}")
            
            response = table.query(**kwargs)
            items = response.get("Items", None)
            
            logger.info(f"Fetched {len(items)} from dynamodb: {items}")
            if assemble_entites:
                return self.assemble_from_items(items)
            else:
                return [self.model_validate(item) for item in items]
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
            exclude_props = {"__fields_set__", "model_fields_set", "model_extra", "PK", "SK"}
        else:
            exclude_props = {"__fields_set__", "model_fields_set", "model_extra"}

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
    
    def upsert(self, table, only_set_once: list = []):
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
        
        if self.uses_versioning():
            expression_attr_names["#version"] = "version"
            expression_attr_values[":incoming_version"] = incoming_version
            kwargs["ConditionExpression"] = "attribute_exists(#version) OR #version <= :incoming_version"

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
    def __init__(self, model: DynamoModel, incoming_version: int):
        super().__init__(f"Version conflict on {model.PK} / v{incoming_version}")
        self.model = model
        self.incoming_version = incoming_version

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
