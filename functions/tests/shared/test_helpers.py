import json
from decimal import Decimal
import pytest

from _shared.helpers import make_response

# --- Fictures ---

@pytest.fixture
def sample_body():
    return {
        "message": "Success",
        "amount": Decimal("12.34"),
        "nested": {"price": Decimal("56.78")},
        "list": [1, 2, Decimal("3.14")]
    }

# --- Test Cases ---

def test_make_response_structure(sample_body):
    resp = make_response(200, sample_body)
    
    assert isinstance(resp, dict)
    assert "statusCode" in resp
    assert "headers" in resp
    assert "body" in resp

def test_status_code_is_correct(sample_body):
    resp = make_response(201, sample_body)
    assert resp["statusCode"] == 201

def test_headers_are_set_correctly(sample_body):
    resp = make_response(200, sample_body)
    headers = resp["headers"]
    assert headers["Content-Type"] == "application/json"
    assert headers["Allow-Origin"] == "*"

def test_body_is_valid_json(sample_body):
    resp = make_response(200, sample_body)
    try:
        parsed = json.loads(resp["body"])
    except Exception as e:
        pytest.fail(f"Body is not valid JSON: {e}")
    assert parsed["message"] == "Success"

def test_decimal_encoding(sample_body):
    resp = make_response(200, sample_body)
    parsed = json.loads(resp["body"])
    assert parsed["amount"] == 12.34
    assert parsed["nested"]["price"] == 56.78
    assert parsed["list"][-1] == 3.14

def test_empty_body():
    resp = make_response(204, {})
    assert json.loads(resp["body"]) == {}

def test_none_body():
    resp = make_response(204, None)
    assert json.loads(resp["body"]) is None    

def test_unserializable_object_raises():
    class Unserializable:
        pass

    with pytest.raises(TypeError):
        make_response(500, {"bad": Unserializable()})

def test_input_body_not_mutated(sample_body):
    original = sample_body.copy()
    make_response(200, sample_body)
    assert sample_body == original