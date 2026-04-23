import os

# Set env vars before importing the handler module, which reads them at module load time.
os.environ.setdefault("STAGE_NAME", "test")
os.environ.setdefault("ORG_TABLE_NAME_TEMPLATE", "test-org_name-table")

import json
from unittest.mock import patch, MagicMock

from _pydantic.dynamodb import TransactUpsertResult, TransactUpsertFailure
from _pydantic.models.events_models import UpdateEventRequest

# Patch boto3 before importing so module-level resource/client calls don't hit AWS.
with patch("boto3.resource", return_value=MagicMock()), \
     patch("boto3.client", return_value=MagicMock()):
    from functions.events.lambda_events import update_event


# --- Helpers ---

def _success():
    return TransactUpsertResult(successful=[MagicMock()], failed=[], failures=[])


def _failure(inferred=None, code="conditional_failed", dynamodb_code="ConditionalCheckFailed"):
    f = TransactUpsertFailure(
        index=0,
        pk="EVENT#evt_test",
        sk="EVENT#evt_test",
        code=code,
        dynamodb_code=dynamodb_code,
        message="Condition check failed",
        old_item=None,
        inferred=inferred,
    )
    return TransactUpsertResult(successful=[], failed=[MagicMock()], failures=[f])


# A pre-generated valid KSUID — the DynamoModel validator rejects arbitrary strings.
_VALID_KSUID = "3CjtaDXd13mJJ0QmLqu062CNynG"


def _existing_event(capacity=10, reserved=1, number_sold=1):
    """Mock an EventModel returned by get_single_event."""
    m = MagicMock()
    m.capacity = capacity
    m.reserved = reserved
    m.number_sold = number_sold
    m.ksuid = _VALID_KSUID
    return m


def _update_request(new_capacity=8, ksuid=None):
    """Build a minimal UpdateEventRequest changing capacity."""
    return UpdateEventRequest.model_validate({
        "event": {
            "name": "Test Event",
            "ksuid": ksuid or _VALID_KSUID,
            "capacity": new_capacity,
        }
    })


# --- Capacity mutation response mapping ---

def test_capacity_mutation_remaining_insufficient_returns_400():
    """If DynamoDB atomically rejects the downsize (remaining_capacity < delta), return 400."""
    with (
        patch(
            "functions.events.lambda_events.get_single_event",
            return_value=_existing_event(capacity=10, reserved=1, number_sold=1),
        ),
        patch(
            "functions.events.lambda_events.event_capacity_mutation",
            return_value=_failure(inferred="remaining_capacity_insufficient"),
        ),
    ):
        resp = update_event(_update_request(new_capacity=8), organisation_slug="testorg")
    assert resp["statusCode"] == 400
    body = json.loads(resp["body"])
    assert "capacity" in body["message"].lower()


def test_capacity_mutation_version_conflict_returns_409():
    with (
        patch(
            "functions.events.lambda_events.get_single_event",
            return_value=_existing_event(capacity=10, reserved=1, number_sold=1),
        ),
        patch(
            "functions.events.lambda_events.event_capacity_mutation",
            return_value=_failure(inferred="version_conflict", code="version_conflict", dynamodb_code=None),
        ),
    ):
        resp = update_event(_update_request(new_capacity=8), organisation_slug="testorg")
    assert resp["statusCode"] == 409


def test_capacity_mutation_throttled_returns_503():
    with (
        patch(
            "functions.events.lambda_events.get_single_event",
            return_value=_existing_event(capacity=10, reserved=1, number_sold=1),
        ),
        patch(
            "functions.events.lambda_events.event_capacity_mutation",
            return_value=_failure(code="throttled", dynamodb_code=None),
        ),
    ):
        resp = update_event(_update_request(new_capacity=8), organisation_slug="testorg")
    assert resp["statusCode"] == 503


# --- Pre-mutation Python-level guard ---

def test_new_capacity_below_committed_returns_400_without_hitting_db():
    """If new capacity < reserved + number_sold, reject before any DynamoDB write."""
    mock_mutation = MagicMock()
    with (
        patch(
            "functions.events.lambda_events.get_single_event",
            # reserved=3, number_sold=3 → committed=6; new capacity=5 < 6
            return_value=_existing_event(capacity=10, reserved=3, number_sold=3),
        ),
        patch("functions.events.lambda_events.event_capacity_mutation", mock_mutation),
    ):
        resp = update_event(_update_request(new_capacity=5), organisation_slug="testorg")
    assert resp["statusCode"] == 400
    mock_mutation.assert_not_called()


def test_capacity_upsize_uses_positive_delta():
    """Increasing capacity should call event_capacity_mutation with a positive remaining_capacity_delta."""
    captured = {}

    def capture(*args, **kwargs):
        captured.update(kwargs)
        return _success()

    with (
        patch(
            "functions.events.lambda_events.get_single_event",
            return_value=_existing_event(capacity=10, reserved=1, number_sold=1),
        ),
        patch("functions.events.lambda_events.event_capacity_mutation", side_effect=capture),
    ):
        resp = update_event(_update_request(new_capacity=15), organisation_slug="testorg")

    assert resp["statusCode"] == 201
    assert captured["remaining_capacity_delta"] == 5   # 15 - 10
    assert captured["require_remaining_at_least"] is None
