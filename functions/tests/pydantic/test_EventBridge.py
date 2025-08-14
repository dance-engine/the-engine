import pytest
from unittest.mock import MagicMock
from datetime import datetime, timezone
from decimal import Decimal
import json
from pydantic import ValidationError

from _pydantic.EventBridge import (
    triggerEBEvent,
    trigger_eventbridge_event,
    EventBridgeEventDetail,
    EventBridgeEvent,
    EventType,
    Action,
)
from _shared.DecimalEncoder import DecimalEncoder

import logging

logger = logging.getLogger()
logger.setLevel("INFO")

# --- Fixtures ---

@pytest.fixture
def dt():
    return datetime(2022, 10, 31, 20, 32, 42, tzinfo=timezone.utc)

@pytest.fixture
def detail_dict(dt):
    return {
        "timestamp": dt,
        "organisation": "org-demo",
        "resource_type": "bundle",
        "resource_id": "bdl_123",
        "action": "created",
        "data": {"foo": "bar"},
    }

@pytest.fixture
def detail_model(dt):
    return EventBridgeEventDetail(
        timestamp=dt,
        organisation="org-demo",
        resource_type=EventType.bundle,
        resource_id="bdl_123",
        action=Action.created,
        data={"name": "something"}
    )

# --- Tests for EventBridgeEventDetail ---

def test_EventBridgeEventDetail_missing_required():
    with pytest.raises(ValueError):
        EventBridgeEventDetail(
            timestamp=datetime.now(timezone.utc),
            organisation="org",
            resource_type=EventType.bundle,
            resource_id="id",
        )

# --- Tests for EventBridgeEvent model and validator ---

def test_EventBridgeEvent_generate_detail_type_from_model(detail_model):
    event = EventBridgeEvent(source="a", detail=detail_model)
    expected_detail_type = f"{detail_model.resource_type.value}.{detail_model.action.value}"
    assert event.detail_type == expected_detail_type
    assert event.detail == detail_model

def test_EventBridgeEvent_invalid_detail_dict():
    with pytest.raises(ValueError):
        EventBridgeEvent(source="a", detail={"foo": "bar"})


# --- Tests for trigger_eventbridge_event ---

def test_trigger_eventbridge_event_success(detail_model, dt):
    mock_client = MagicMock()
    mock_client.put_events.return_value = {"FailedEntryCount": 0}
    result = trigger_eventbridge_event(
        mock_client,
        source="a",
        resource_type=EventType.item,
        action=Action.deleted,
        organisation="org-demo",
        resource_id="itm_1234",
        data={"k": "v"},
        timestamp=dt,
    )
    assert result is True
    mock_client.put_events.assert_called_once()
    entry = mock_client.put_events.call_args[1]["Entries"][0]
    assert entry["Source"] == "a"
    assert entry["DetailType"] == f"{EventType.item.value}.{Action.deleted.value}"
    detail = json.loads(entry["Detail"])
    assert detail["organisation"] == "org-demo"
    assert detail["resource_type"] == EventType.item.value
    assert detail["action"] == Action.deleted.value
    assert detail["resource_id"] == "itm_1234"
    assert detail["data"] == {"k": "v"}
    assert detail["timestamp"] == "2022-10-31T20:32:42Z"

def test_trigger_eventbridge_event_failed_entry(dt):
    mock_client = MagicMock()
    mock_client.put_events.return_value = {"FailedEntryCount": 1}
    result = trigger_eventbridge_event(
        mock_client,
        source="a",
        resource_type=EventType.bundle,
        action=Action.published,
        organisation="org-demo",
        resource_id="bdl_123",
        data=None,
        meta=None,
        timestamp=dt,
    )
    assert result is False

def test_trigger_eventbridge_event_exception():
    mock_client = MagicMock()
    mock_client.put_events.side_effect = RuntimeError("epxloded")
    result = trigger_eventbridge_event(
        mock_client,
        source="a",
        resource_type=EventType.event,
        action=Action.archived,
        organisation="org-demo",
        resource_id="evt_5432",
    )
    assert result is False
