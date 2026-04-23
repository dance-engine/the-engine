import pytest
from unittest.mock import patch, MagicMock

from _pydantic.dynamodb import TransactUpsertResult, TransactUpsertFailure
from functions.shared.event_capacity import event_capacity_mutation


# --- Helpers ---

def _success():
    return TransactUpsertResult(successful=[MagicMock()], failed=[], failures=[])


def _failure(inferred=None, code="conditional_failed", dynamodb_code="ConditionalCheckFailed"):
    f = TransactUpsertFailure(
        index=0,
        pk="EVENT#evt1",
        sk="EVENT#evt1",
        code=code,
        dynamodb_code=dynamodb_code,
        message="Condition check failed",
        old_item=None,
        inferred=inferred,
    )
    return TransactUpsertResult(successful=[], failed=[MagicMock()], failures=[f])


@pytest.fixture
def table():
    return MagicMock()


_NOW = "2026-01-01T00:00:00.000Z"


# --- ADD fields ---

def test_reserve_uses_add_for_reserved_and_remaining(table):
    with patch("functions.shared.event_capacity.transact_upsert", return_value=_success()) as mock_tx:
        event_capacity_mutation(
            table,
            organisation_slug="org",
            event_ksuid="evt1",
            reserved_delta=1,
            remaining_capacity_delta=-1,
            current_time=_NOW,
        )
    _, kwargs = mock_tx.call_args
    assert "reserved" in kwargs["add_fields"]
    assert "remaining_capacity" in kwargs["add_fields"]


def test_completed_adds_number_sold_to_add_fields(table):
    with patch("functions.shared.event_capacity.transact_upsert", return_value=_success()) as mock_tx:
        event_capacity_mutation(
            table,
            organisation_slug="org",
            event_ksuid="evt1",
            reserved_delta=-1,
            remaining_capacity_delta=0,
            current_time=_NOW,
            number_sold_delta=1,
            require_reserved_at_least=1,
        )
    _, kwargs = mock_tx.call_args
    assert "number_sold" in kwargs["add_fields"]


def test_number_sold_absent_from_add_fields_when_not_provided(table):
    with patch("functions.shared.event_capacity.transact_upsert", return_value=_success()) as mock_tx:
        event_capacity_mutation(
            table,
            organisation_slug="org",
            event_ksuid="evt1",
            reserved_delta=1,
            remaining_capacity_delta=-1,
            current_time=_NOW,
        )
    _, kwargs = mock_tx.call_args
    assert "number_sold" not in kwargs["add_fields"]


# --- Deltas passed to model ---

def test_reserve_passes_correct_deltas_to_model(table):
    with patch("functions.shared.event_capacity.transact_upsert", return_value=_success()) as mock_tx:
        event_capacity_mutation(
            table,
            organisation_slug="org",
            event_ksuid="evt1",
            reserved_delta=1,
            remaining_capacity_delta=-1,
            current_time=_NOW,
        )
    items = mock_tx.call_args[0][1]
    assert items[0].reserved == 1
    assert items[0].remaining_capacity == -1


def test_unreserve_passes_correct_deltas_to_model(table):
    with patch("functions.shared.event_capacity.transact_upsert", return_value=_success()) as mock_tx:
        event_capacity_mutation(
            table,
            organisation_slug="org",
            event_ksuid="evt1",
            reserved_delta=-1,
            remaining_capacity_delta=1,
            current_time=_NOW,
            require_reserved_at_least=1,
        )
    items = mock_tx.call_args[0][1]
    assert items[0].reserved == -1
    assert items[0].remaining_capacity == 1


def test_completed_passes_zero_remaining_delta(table):
    with patch("functions.shared.event_capacity.transact_upsert", return_value=_success()) as mock_tx:
        event_capacity_mutation(
            table,
            organisation_slug="org",
            event_ksuid="evt1",
            reserved_delta=-1,
            remaining_capacity_delta=0,
            current_time=_NOW,
            number_sold_delta=1,
            require_reserved_at_least=1,
        )
    items = mock_tx.call_args[0][1]
    assert items[0].remaining_capacity == 0
    assert items[0].reserved == -1
    assert items[0].number_sold == 1


# --- Condition expressions ---

def test_require_remaining_at_least_builds_condition(table):
    with patch("functions.shared.event_capacity.transact_upsert", return_value=_success()) as mock_tx:
        event_capacity_mutation(
            table,
            organisation_slug="org",
            event_ksuid="evt1",
            reserved_delta=1,
            remaining_capacity_delta=-1,
            current_time=_NOW,
            require_remaining_at_least=1,
        )
    _, kwargs = mock_tx.call_args
    assert kwargs["condition_expression"] is not None
    assert "#remaining_capacity" in kwargs["condition_expression"]
    assert kwargs["extra_expression_attr_values"][":min_remaining"] == 1


def test_require_reserved_at_least_builds_condition(table):
    with patch("functions.shared.event_capacity.transact_upsert", return_value=_success()) as mock_tx:
        event_capacity_mutation(
            table,
            organisation_slug="org",
            event_ksuid="evt1",
            reserved_delta=-1,
            remaining_capacity_delta=1,
            current_time=_NOW,
            require_reserved_at_least=1,
        )
    _, kwargs = mock_tx.call_args
    assert kwargs["condition_expression"] is not None
    assert "#reserved" in kwargs["condition_expression"]
    assert kwargs["extra_expression_attr_values"][":min_reserved"] == 1


def test_no_guards_produces_no_condition(table):
    with patch("functions.shared.event_capacity.transact_upsert", return_value=_success()) as mock_tx:
        event_capacity_mutation(
            table,
            organisation_slug="org",
            event_ksuid="evt1",
            reserved_delta=0,
            remaining_capacity_delta=5,
            current_time=_NOW,
        )
    _, kwargs = mock_tx.call_args
    assert kwargs["condition_expression"] is None


def test_both_guards_combined_with_and(table):
    with patch("functions.shared.event_capacity.transact_upsert", return_value=_success()) as mock_tx:
        event_capacity_mutation(
            table,
            organisation_slug="org",
            event_ksuid="evt1",
            reserved_delta=0,
            remaining_capacity_delta=-2,
            current_time=_NOW,
            require_remaining_at_least=2,
            require_reserved_at_least=1,
        )
    _, kwargs = mock_tx.call_args
    assert " AND " in kwargs["condition_expression"]
    assert "#remaining_capacity" in kwargs["condition_expression"]
    assert "#reserved" in kwargs["condition_expression"]


# --- Result passthrough ---

def test_success_result_propagated(table):
    expected = _success()
    with patch("functions.shared.event_capacity.transact_upsert", return_value=expected):
        result = event_capacity_mutation(
            table,
            organisation_slug="org",
            event_ksuid="evt1",
            reserved_delta=1,
            remaining_capacity_delta=-1,
            current_time=_NOW,
        )
    assert result is expected
    assert not result.failed


def test_failure_result_propagated(table):
    expected = _failure(inferred="remaining_capacity_insufficient")
    with patch("functions.shared.event_capacity.transact_upsert", return_value=expected):
        result = event_capacity_mutation(
            table,
            organisation_slug="org",
            event_ksuid="evt1",
            reserved_delta=1,
            remaining_capacity_delta=-1,
            current_time=_NOW,
            require_remaining_at_least=1,
        )
    assert result is expected
    assert result.failed
    assert result.failures[0].inferred == "remaining_capacity_insufficient"
