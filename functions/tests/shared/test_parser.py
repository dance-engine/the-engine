import pytest
from _shared.parser import parse_event
import logging
logger = logging.getLogger()
logger.setLevel("INFO")


import json
from decimal import Decimal

# --- Test Cases ---

def test_parse_event_with_json_body():
    """Test parsing an HTTP event with a JSON body."""
    body = {"name": "test", "price": 10.5}
    event = {"body": json.dumps(body)}
    resp = parse_event(event)
    assert isinstance(resp, dict)
    assert resp["name"] == "test"
    assert resp["price"] == Decimal('10.5')

def test_parse_event_with_dict_body():
    """Test parsing an HTTP event with a dictionary body."""
    body = {"name": "test", "price": 10.5}
    event = {"body": body}
    resp = parse_event(event)
    assert isinstance(resp, dict)
    assert resp == body
    assert resp["name"] == "test"
    assert resp["price"] == Decimal('10.5')

def test_parse_event_with_request_context():
    """Test parsing an HTTP event with a requestContext."""
    body = {"name": "test", "price": 10.5}
    request_context = {"routeKey": "GET /{organisation}/events",}
    event = {"body": json.dumps(body), "requestContext": request_context}
    resp = parse_event(event)
    assert isinstance(resp, dict)
    assert resp["name"] == "test"
    assert resp['requestContext'] == request_context

def test_parse_event_stringified():
    """Test parsing a stringified event."""
    event = json.dumps({"test": "value"})
    resp = parse_event(event)
    assert resp == {"test": "value"}

def test_parse_event_float_becomes_decimal():
    """Test that a float in the event body is converted to Decimal."""
    event = {"body": json.dumps({"price": 12.34})}
    resp = parse_event(event)
    assert isinstance(resp["price"], Decimal)
    assert resp["price"] == Decimal("12.34")

def test_parse_event_json_in_body_raises():
    """Test that parsing a non-dictionary body raises an error."""
    event = {"body": "{bad json"}
    with pytest.raises(ValueError):
        parse_event(event)

def test_parse_event_non_dict_non_json_body_raises():
    """Test that a non-dictionary, non-JSON body raises an error."""
    event = {"body": 12345}
    with pytest.raises(ValueError):
        parse_event(event)

def test_parse_event_string_not_json_raises():
    """Test that a string that is not valid JSON raises an error."""
    event = "not a json string"
    with pytest.raises(ValueError):
        parse_event(event)

def test_parse_event_non_dict_non_str_input_raises():
    """Test that a non-dictionary, non-string input raises an error."""
    with pytest.raises(ValueError):
        parse_event(1234)

    with pytest.raises(ValueError):
        parse_event(["not", "a", "dict"])