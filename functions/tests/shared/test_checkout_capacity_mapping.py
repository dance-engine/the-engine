import os

# Set env vars before importing the handler module, which reads them at module load time.
os.environ.setdefault("STAGE_NAME", "test")
os.environ.setdefault("ORG_TABLE_NAME_TEMPLATE", "test-org_name-table")
os.environ.setdefault("STRIPE_API_KEY", "sk_test_fake")

import json
from unittest.mock import patch, MagicMock

from _pydantic.dynamodb import TransactUpsertResult, TransactUpsertFailure

# Patch boto3 before importing so module-level resource/client calls don't hit AWS.
with patch("boto3.resource", return_value=MagicMock()), \
     patch("boto3.client", return_value=MagicMock()):
    from functions.checkout.lambda_checkout import unreserve, completed


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


def _stripe_event(organisation="testorg", event_ksuid="evt_test"):
    return {
        "detail": {
            "account": "acct_test",
            "data": {
                "object": {
                    "metadata": {
                        "organisation": organisation,
                        "event_ksuid": event_ksuid,
                    }
                }
            },
        }
    }


def _completed_stripe_event(session_id="cs_test_123", organisation="testorg", event_ksuid="evt_test"):
    return {
        "detail": {
            "account": "acct_test",
            "data": {
                "object": {
                    "id": session_id,
                    "metadata": {
                        "organisation": organisation,
                        "event_ksuid": event_ksuid,
                    },
                }
            },
        }
    }


def _mock_stripe_session(session_id="cs_test_123", organisation="testorg", event_ksuid="evt_test"):
    """Return a dict-like mock that mimics a Stripe Session object."""
    data = {
        "metadata": {"organisation": organisation, "event_ksuid": event_ksuid},
        "id": session_id,
        "line_items": {"data": []},
        "custom_fields": [],
        "payment_intent": {"id": "pi_test"},
        "customer_email": "buyer@example.com",
        "customer_details": {"email": "buyer@example.com"},
    }
    m = MagicMock()
    m.get = data.get
    return m


# --- unreserve ---

def test_unreserve_success_returns_200():
    with patch("functions.checkout.lambda_checkout.event_capacity_mutation", return_value=_success()):
        resp = unreserve(_stripe_event())
    assert resp["statusCode"] == 200


def test_unreserve_already_zero_returns_200_not_error():
    """ConditionalCheckFailed when reserved is already 0 should be a no-op 200."""
    with patch(
        "functions.checkout.lambda_checkout.event_capacity_mutation",
        return_value=_failure(code="conditional_failed", dynamodb_code="ConditionalCheckFailed"),
    ):
        resp = unreserve(_stripe_event())
    assert resp["statusCode"] == 200
    body = json.loads(resp["body"])
    assert "reserved already 0" in body["message"].lower() or "no reservation" in body["message"].lower()


def test_unreserve_missing_metadata_returns_400():
    event_no_meta = {"detail": {"data": {"object": {"metadata": {}}}}}
    resp = unreserve(event_no_meta)
    assert resp["statusCode"] == 400


def test_unreserve_version_conflict_returns_409():
    with patch(
        "functions.checkout.lambda_checkout.event_capacity_mutation",
        return_value=_failure(inferred="version_conflict", code="version_conflict", dynamodb_code=None),
    ):
        resp = unreserve(_stripe_event())
    assert resp["statusCode"] == 409


def test_unreserve_throttled_returns_503():
    with patch(
        "functions.checkout.lambda_checkout.event_capacity_mutation",
        return_value=_failure(code="throttled", dynamodb_code=None),
    ):
        resp = unreserve(_stripe_event())
    assert resp["statusCode"] == 503


# --- completed ---

def test_completed_success_returns_200():
    with (
        patch("functions.checkout.lambda_checkout.event_capacity_mutation", return_value=_success()),
        patch("functions.checkout.lambda_checkout.stripe") as mock_stripe,
        patch("functions.checkout.lambda_checkout.trigger_eventbridge_event"),
    ):
        mock_stripe.checkout.Session.retrieve.return_value = _mock_stripe_session()
        resp = completed(_completed_stripe_event())
    assert resp["statusCode"] == 200


def test_completed_duplicate_webhook_returns_200_not_500():
    """Second delivery of checkout.session.completed should be idempotent."""
    with (
        patch(
            "functions.checkout.lambda_checkout.event_capacity_mutation",
            return_value=_failure(code="conditional_failed", dynamodb_code="ConditionalCheckFailed"),
        ),
        patch("functions.checkout.lambda_checkout.stripe") as mock_stripe,
    ):
        mock_stripe.checkout.Session.retrieve.return_value = _mock_stripe_session()
        resp = completed(_completed_stripe_event())
    assert resp["statusCode"] == 200
    body = json.loads(resp["body"])
    assert "already reconciled" in body["message"].lower()


def test_completed_other_db_failure_returns_500():
    """Any non-idempotent mutation failure should surface as 500 so the delivery is retried."""
    with (
        patch(
            "functions.checkout.lambda_checkout.event_capacity_mutation",
            return_value=_failure(inferred="version_conflict", code="version_conflict", dynamodb_code=None),
        ),
        patch("functions.checkout.lambda_checkout.stripe") as mock_stripe,
    ):
        mock_stripe.checkout.Session.retrieve.return_value = _mock_stripe_session()
        resp = completed(_completed_stripe_event())
    assert resp["statusCode"] == 500
