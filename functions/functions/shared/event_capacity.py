from typing import Any

from _pydantic.dynamodb import transact_upsert
from _pydantic.models.models_extended import EventModel


def event_capacity_mutation(
    table,
    *,
    organisation_slug: str,
    event_ksuid: str,
    reserved_delta: int,
    remaining_capacity_delta: int,
    current_time: str,
    require_remaining_at_least: int | None = None,
    require_reserved_at_least: int | None = None,
    number_sold_delta: int | None = None,
    set_fields: dict[str, Any] | None = None,
    version_override: bool = True,
    only_set_once: set[str] | None = None,
):
    """Apply atomic event capacity mutations with optional conditional guards.

    This helper intentionally uses ADD for counter fields (`reserved`,
    `remaining_capacity`, and optionally `number_sold`) so concurrent updates are
    merged atomically rather than overwritten.
    """
    extra_names = {"#remaining_capacity": "remaining_capacity", "#reserved": "reserved"}
    extra_values = {}
    add_fields = {"reserved", "remaining_capacity"}

    conditions = []
    if require_remaining_at_least is not None:
        conditions.append("attribute_exists(#remaining_capacity) AND #remaining_capacity >= :min_remaining")
        extra_values[":min_remaining"] = int(require_remaining_at_least)
    if require_reserved_at_least is not None:
        conditions.append("attribute_exists(#reserved) AND #reserved >= :min_reserved")
        extra_values[":min_reserved"] = int(require_reserved_at_least)
    condition_expr = " AND ".join(conditions) if conditions else None

    model_data = {
        "name": "placeholder",
        "organisation": organisation_slug,
        "ksuid": event_ksuid,
        "reserved": int(reserved_delta),
        "remaining_capacity": int(remaining_capacity_delta),
        "updated_at": current_time,
    }

    if number_sold_delta is not None:
        model_data["number_sold"] = int(number_sold_delta)
        add_fields.add("number_sold")

    if set_fields:
        model_data.update(set_fields)

    event_models = [EventModel.model_validate(model_data)]

    result = transact_upsert(
        table,
        event_models,
        condition_expression=condition_expr,
        add_fields=add_fields,
        extra_expression_attr_names=extra_names,
        extra_expression_attr_values=extra_values,
        version_override=version_override,
        only_set_once=only_set_once or {"created_at", "organisation", "ksuid", "name", "event_slug", "status"},
    )
    return result
