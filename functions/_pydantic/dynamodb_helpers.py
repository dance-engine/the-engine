from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Any, Optional, Union


def convert_datetime_to_iso_8601_with_z_suffix(dt: Union[datetime, str]) -> str:
    """Convert a datetime/string into an ISO8601 UTC timestamp with Z suffix."""
    try:
        if isinstance(dt, str):
            dt = datetime.fromisoformat(dt.replace("Z", "+00:00"))
        return dt.strftime("%Y-%m-%dT%H:%M:%SZ")
    except Exception as e:
        raise ValueError(f"Invalid input for datetime conversion: {dt!r}. Error: {e}")


def convert_floats_to_decimals(obj: Any) -> Any:
    """Recursively convert float values to Decimal for DynamoDB compatibility."""
    if isinstance(obj, float):
        return Decimal(str(obj))
    if isinstance(obj, dict):
        return {k: convert_floats_to_decimals(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [convert_floats_to_decimals(i) for i in obj]
    return obj


def _decode_dynamodb_attr_value(value: Any) -> tuple[Any, Optional[str]]:
    """Decode low-level DynamoDB AttributeValue shapes when present."""
    if isinstance(value, dict) and len(value) == 1:
        attr_type, attr_value = next(iter(value.items()))
        if attr_type == "N":
            try:
                return int(attr_value), attr_type
            except (TypeError, ValueError):
                try:
                    return float(attr_value), attr_type
                except (TypeError, ValueError):
                    return attr_value, attr_type
        if attr_type == "S":
            return attr_value, attr_type
        return attr_value, attr_type
    return value, None


def _get_failed_item_field(
    error_response: dict[str, Any] | None,
    field_name: str,
) -> tuple[Any, Optional[str]]:
    """Read and decode a single field from ALL_OLD condition-failure payloads."""
    if not isinstance(error_response, dict):
        return None, None
    old_item = error_response.get("Item")
    if not isinstance(old_item, dict):
        return None, None
    return _decode_dynamodb_attr_value(old_item.get(field_name))


def _repair_string_number_field(
    table: Any,
    pk: str,
    sk: str,
    field_name: str,
    current_value: Any,
) -> bool:
    """Convert a field from DynamoDB string type to number type when value is int-like."""
    try:
        repaired_numeric_value = int(current_value)
    except (TypeError, ValueError):
        return False

    field_placeholder = "#field"
    number_placeholder = ":number_value"
    string_placeholder = ":string_value"
    type_placeholder = ":string_type"

    table.update_item(
        Key={"PK": pk, "SK": sk},
        UpdateExpression=f"SET {field_placeholder} = {number_placeholder}",
        ConditionExpression=(
            f"attribute_exists({field_placeholder}) "
            f"AND attribute_type({field_placeholder}, {type_placeholder}) "
            f"AND {field_placeholder} = {string_placeholder}"
        ),
        ExpressionAttributeNames={field_placeholder: field_name},
        ExpressionAttributeValues={
            number_placeholder: repaired_numeric_value,
            type_placeholder: "S",
            string_placeholder: str(current_value),
        },
    )
    return True
