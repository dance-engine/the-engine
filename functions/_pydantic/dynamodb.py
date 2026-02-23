import re
from typing import Dict, Any, Union, Literal, Optional
from botocore.exceptions import ClientError
import logging
from datetime import datetime, timezone
import traceback
from decimal import Decimal
from dataclasses import dataclass
from typing import Any, Optional

from pydantic import BaseModel, field_validator, Field
from ksuid import KsuidMs

from _pydantic.EventBridge import Action, EventType

logger = logging.getLogger()
logger.setLevel("INFO")

def convert_datetime_to_iso_8601_with_z_suffix(dt: Union[datetime, str]) -> str:
    """
    Convert a datetime object or an ISO 8601 formatted string to an ISO 8601 string 
    with a 'Z' suffix indicating UTC time.

    Parameters
    ----------
    dt : Union[datetime, str]
        A datetime object or an ISO 8601 formatted string. If a string is provided, 
        it should be in a format that can be parsed by `datetime.fromisoformat`.

    Returns
    -------
    str
        An ISO 8601 formatted string representing the input datetime in UTC with a 'Z' suffix.

    Raises
    ------
    ValueError
        If the input is not a valid datetime or string representation of a datetime.
    """
    try:
        if isinstance(dt, str):
            dt = datetime.fromisoformat(dt.replace("Z", "+00:00"))
        return dt.strftime('%Y-%m-%dT%H:%M:%SZ')
    except Exception as e:
        raise ValueError(f"Invalid input for datetime conversion: {dt!r}. Error: {e}")


def convert_floats_to_decimals(obj: Any) -> Any:
    """
    Convert all float values in a given object to Decimal.

    This function recursively traverses the input object, which can be a 
    float, dictionary, list, or any other type, and converts any float 
    values it encounters to Decimal. If the input is a dictionary or 
    list, it processes each element accordingly.

    Parameters
    ----------
    obj : Any
        The input object that may contain float values.

    Returns
    -------
    Any
        The input object with all float values converted to Decimal.
    """
    if isinstance(obj, float):
        return Decimal(str(obj))
    elif isinstance(obj, dict):
        return {k: convert_floats_to_decimals(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_floats_to_decimals(i) for i in obj]
    else:
        return obj

class DynamoModel(BaseModel):
    """
    A base model for DynamoDB interactions using Pydantic.

    This class provides methods for validation, querying, and 
    serialization of DynamoDB items. It includes support for 
    versioning and entity relationships.

    Attributes
    ----------
    related_entities : dict
        A dictionary mapping related entity types to their attributes and modes.
    entity_type : str
        The type of the entity represented by the model.
    PK : str
        The primary key for the DynamoDB item.
    SK : str
        The sort key for the DynamoDB item.
    gsi1PK : str
        The global secondary index primary key.
    gsi1SK : str
        The global secondary index sort key.

    Methods
    -------
    query_gsi(table, key_condition, index_name=None, filter_expression=None, assemble_entites=False)
        Queries the DynamoDB table using the specified key condition and optional filters.
    to_dynamo(exclude_keys=True)
        Serializes the model instance to a dictionary suitable for DynamoDB.
    upsert(table, only_set_once=[], condition_expression=None)
        Inserts or updates the item in the DynamoDB table.
    assemble_from_items(items)
        Assembles a model instance from a list of DynamoDB items.
    """
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
    
    def query_gsi(self, table, key_condition, index_name=None, assemble_entites=False) -> list:
        """
        Query a DynamoDB table using a Global Secondary Index (GSI).

        Parameters
        ----------
        table : boto3.dynamodb.table.Table
            The DynamoDB table resource to query.
        key_condition : str
            The condition that specifies the key values for items to be retrieved.
        index_name : str, optional
            The name of the Global Secondary Index to query (default is None).
        assemble_entites : bool, optional
            Whether to assemble entities from the items (default is False).

        Returns
        -------
        list
            A list of validated items retrieved from the DynamoDB table.

        Raises
        ------
        Exception
            If the query fails, an exception is raised and logged.
        """
        try:
            kwargs = {
                "KeyConditionExpression":key_condition
            }
            if index_name:
                kwargs["IndexName"] = index_name

            logger.info(f"query kwargs: {kwargs}")
            
            response = table.query(**kwargs)
            items = response.get("Items", None)
            
            logger.info(f"Fetched {len(items)} from dynamodb: {items}")
            if not items:
                return None
            if assemble_entites:
                return self.assemble_from_items(items)
            else:
                return [self.model_validate(item) for item in items] if len(items) > 1 else self.model_validate(items[0])
        except Exception as e:
            logger.error("Query failed: %s", str(e), exc_info=True)
            raise
    
    def _slugify(self, string) -> str:
        """
        Convert a string into a URL-friendly slug.

        Parameters
        ----------
        string : str
            The input string to be slugified.

        Returns
        -------
        str
            A slugified version of the input string, where non-alphanumeric 
            characters are replaced with hyphens and the string is 
            converted to lowercase.
        """
        return re.sub(r'[^a-zA-Z0-9]+', '-', string.strip().lower()).strip('-')
    
    def uses_versioning(self) -> bool:
        """
        Check if the instance uses versioning.

        Returns
        -------
        bool
            True if the instance has a 'version' attribute, False otherwise.
        """
        return hasattr(self, "version")

    def to_dynamo(self, exclude_keys=True) -> dict:
        """
        Convert the instance to a DynamoDB-compatible dictionary.

        Parameters
        ----------
        exclude_keys : bool, optional
            Whether to exclude certain keys from the output dictionary. 
            Default is True.

        Returns
        -------
        dict
            A dictionary representation of the instance, formatted for 
            DynamoDB, with optional exclusion of specified keys.
        """
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
        """
        Upserts an item into the DynamoDB table.

        Parameters
        ----------
        table : boto3.dynamodb.table.Table
            The DynamoDB table where the item will be upserted.
        only_set_once : list, optional
            A list of attribute names that should only be set if they do not already exist in the item.
            Default is an empty list.
        condition_expression : str, optional
            An additional condition expression to apply during the upsert operation.
            Default is None.

        Raises
        ------
        VersionConflictError
            If a version conflict occurs during the upsert operation.
        Exception
            If any other error occurs during the upsert operation.

        Returns
        -------
        dict
            The updated item after the upsert operation.
        """
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
        """
        Assemble a DynamoModel instance from a list of item dictionaries.

        Parameters
        ----------
        items : list[dict]
            A list of dictionaries representing items, each containing an 
            'entity_type' key and other relevant data for model validation.

        Returns
        -------
        DynamoModel
            An instance of the DynamoModel populated with the data from 
            the provided items.

        Raises
        ------
        ValueError
            If no item with the root entity type is found in the provided 
            items, or if an unknown mode is encountered during processing 
            of related entities.
        """
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

            unprocessed_set = {
                frozenset(entry['PutRequest']['Item'].items()) 
                for entry in unprocessed
            }

            for item in batch:
                dynamo_item = item.to_dynamo(exclude_keys=False)
                if frozenset(dynamo_item.items()) in unprocessed_set:
                    unprocessed_items.append(item)
                else:
                    successful_items.append(item)
        except ClientError as e:
            logger.error(f"Batch write failed: {e}")
            raise Exception(e)
        
    return successful_items, unprocessed_items

@dataclass
class TransactUpsertFailure:
    index: int
    pk: str
    sk: str
    code: str
    dynamodb_code: Optional[str]
    message: Optional[str]
    old_item: Optional[dict[str, Any]]
    inferred: Optional[str]

@dataclass
class TransactUpsertResult:
    successful: list[Any]
    failed: list[Any]
    failures: list[TransactUpsertFailure]

def transact_upsert(table, 
                    items: list[DynamoModel], 
                    only_set_once: list = [], 
                    condition_expression: str = None, 
                    add_fields: set[str] | None = None, 
                    extra_expression_attr_names: dict[str, str] | None = None, 
                    extra_expression_attr_values: dict[str, object] | None = None,
                    version_override: bool = False
                    ) -> TransactUpsertResult:
    MAX_BATCH_SIZE = 25 # DynamoDB's maximum batch size is 25 items (stricly enforced)
    client = table.meta.client

    add_fields = set(add_fields or [])
    only_set_once = list(only_set_once or [])

    batches = [items[i:i+MAX_BATCH_SIZE] for i in range(0, len(items), MAX_BATCH_SIZE)]
    successful_items: list[DynamoModel] = []
    failed_items: list[DynamoModel] = []
    failures: list [TransactUpsertFailure] = []

    for batch in batches:
        transact_items = []

        for item in batch:
            conditions: list[str] = []
            set_parts:  list[str] = []
            add_parts:  list[str] = []

            extra_expression_attr_names = dict(extra_expression_attr_names or {})
            extra_expression_attr_values = dict(extra_expression_attr_values or {})

            expression_attr_names = {}
            expression_attr_values = {}

            item_dict = item.to_dynamo(exclude_keys=True)

            if item.uses_versioning() and not version_override:
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

                if key in add_fields:
                    add_parts.append(f"{name_placeholder} {value_placeholder}")
                    continue                

                if key in only_set_once:
                    set_parts.append(f"{name_placeholder} = if_not_exists({name_placeholder}, {value_placeholder})")
                else:
                    set_parts.append(f"{name_placeholder} = {value_placeholder}")

            for k, v in extra_expression_attr_names.items():
                expression_attr_names.setdefault(k, v)
            for k, v in extra_expression_attr_values.items():
                expression_attr_values.setdefault(k, v)

            parts = []
            if set_parts:
                parts.append("SET " + ", ".join(set_parts))
            if add_parts:
                parts.append("ADD " + ", ".join(add_parts))
            if not parts:
                raise ValueError(f"transact_upsert: no updatable attributes for item {item!r}")
            
            update_expression = " ".join(parts)

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
            client.transact_write_items(
                TransactItems=transact_items
            )
            successful_items.extend(batch)
        except client.exceptions.TransactionCanceledException as e:
            logger.warning("Transaction cancelled")
            reasons = e.response.get("CancellationReasons", [])

            if not reasons:
                failed_items.extend(batch)
                failures.extend([
                    TransactUpsertFailure(
                        index=i, 
                        pk=batch[i].PK, 
                        sk=batch[i].SK, 
                        code="Unknown", 
                        dynamodb_code=None, 
                        message=None, 
                        old_item=None, 
                        inferred=None
                    ) for i in range(len(batch))
                ]) 
                
                logger.warning("No cancellation reasons provided, marking all items as failed.")
                continue

            for i, reason in enumerate(reasons):
                code = reason.get("Code")
                msg = reason.get("Message")
                old_item = reason.get("Item")

                inferred = None
                normalised = "Unknown"

                if code == "ConditionalCheckFailed":
                    logger.warning(f"Conditional check failed for item with PK: {batch[i].PK}, SK: {batch[i].SK}. Message: {msg}")
                    normalised = "conditional_failed"

                    if (not version_override) and batch[i].uses_versioning():
                        incoming_version = batch[i].to_dynamo(exclude_keys=True).get("version", 0)
                        old_version = None
                        if isinstance(old_item, dict):
                            old_version = old_item.get("version", None)
                        if isinstance(old_version, (int, float)) and old_version > incoming_version:
                            inferred = "version_conflict"

                    if isinstance(old_item, dict):
                        rc = old_item.get("remaining_capacity", None)
                        if rc is not None:
                            logger.info(f"Old item remaining capacity: {rc}, {type(rc)}")
                            if "N" in rc and rc.get("N") is not None and int(rc["N"]) < 1: 
                            # if isinstance(rc, (int, float)) and rc < 1:
                                logger.info(f"current inffered problem is {inferred} and remaining capacity is {rc}")
                                inferred = inferred or "remaining_capacity_insufficient"
                
                elif code == "TransactionConflict":
                    normalised = "transaction_conflict"
                elif code in ("ProvisionedThroughputExceeded", "ThrottlingException", "RequestLimitExceeded"):
                    normalised = "throttled"
                elif code == "ItemCollectionSizeLimitExceeded":
                    normalised = "item_collection_limit"
                else:
                    normalised = "unknown"

                if code is not None and code != "None":
                    failed_items.append(batch[i])

                failures.append(TransactUpsertFailure(
                    index=i,
                    pk=batch[i].PK,
                    sk=batch[i].SK,
                    code=normalised,
                    dynamodb_code=code,
                    message=msg,
                    old_item=old_item,
                    inferred=inferred,
                ))

            # conflict_idxs = [
            #     idx for idx, reason in enumerate(reasons)
            #     if reason.get("Code") == "ConditionalCheckFailed"
            # ]
            # if conflict_idxs:
            #     conflict_models = [batch[i] for i in conflict_idxs]
            #     conflict_versions = [
            #         batch[i].version for i in conflict_idxs if batch[i].uses_versioning()
            #     ]

            #     raise VersionConflictError(conflict_models, conflict_versions)

            # logger.warning("Transaction cancelled for unknown reasons: %s", reasons)
            # failed_items.extend(batch)
        except Exception as e:
            logger.error(f"Unexpected transaction error: {e}")
            logger.error(traceback.format_exc())
            failed_items.extend(batch)
            failures.extend([
                TransactUpsertFailure(
                    index=i,
                    pk=batch[i].PK,
                    sk=batch[i].SK,
                    code="exception",
                    dynamodb_code=None,
                    message=str(e),
                    old_item=None,
                    inferred=None,
                )
                for i in range(len(batch))
            ])

    return TransactUpsertResult(
        successful=successful_items,
        failed=failed_items,
        failures=failures
    )
