import json
from decimal import Decimal
import pytest

from _shared.DecimalEncoder import DecimalEncoder

# --- Fixtures ---

@pytest.fixture
def sample_decimal():
    return Decimal("12.34")

# --- Test Cases ---
@pytest.mark.parametrize(
    "input_str, expected_val, expected_type",
    [
        ("2", 2, int),               # integer value
        ("2.0", 2, int),             # integer with decimal point
        ("1.25", 1.25, float),       # exact float
        ("0.0000001", 1e-7, float),  # small value
        ("-3.14", -3.14, float),     # negative float
        ("0", 0, int),               # zero integer
        ("0.0", 0, int),             # zero with decimal point
    ],
)
def test_decimal_to_number(input_str, expected_val, expected_type):
    dec = Decimal(input_str)
    dumped = json.dumps(dec, cls=DecimalEncoder)
    result = json.loads(dumped)
    assert result == expected_val
    assert isinstance(result, expected_type)

def test_list_of_decimals():
    data = [Decimal("10"), Decimal("0.1"), Decimal("5.0")]
    dumped = json.dumps(data, cls=DecimalEncoder)
    parsed = json.loads(dumped)
    assert parsed == [10, 0.1, 5]
    
def test_decimal_in_list_and_dict():
    payload = {
        "list": [Decimal("1"), Decimal("2.5"), "text"],
        "nested": {"a": Decimal("3.0"), "b": Decimal("4.56")}
    }
    text = json.dumps(payload, cls=DecimalEncoder)
    parsed = json.loads(text)
    assert parsed["list"] == [1, 2.5, "text"]
    assert parsed["nested"] == {"a": 3, "b": 4.56}


@pytest.mark.parametrize(
    "special_str, expected_exc",
    [
        ("Infinity", OverflowError),
        ("-Infinity", OverflowError),
        ("NaN", ValueError),
    ],
)
def test_special_decimal_values_raise(special_str, expected_exc):
    with pytest.raises(expected_exc):
        json.dumps(Decimal(special_str), cls=DecimalEncoder)

def test_default_encoder_raises_for_unknown_type():
    class Foo:
        pass

    with pytest.raises(TypeError):
        json.dumps(Foo(), cls=DecimalEncoder)
