import json
from _shared.DecimalEncoder import DecimalEncoder

def make_response(status_code, body):
    """
    Creates a standardised HTTP response.

    Parameters
    ----------
    status_code : int
        The HTTP status code for the response.
    body : dict
        The body of the response, which will be serialised to JSON.

    Returns
    -------
    dict
        A dictionary representing the HTTP response, including status code,
        headers, and a JSON-encoded body.
    """
    return {
        "statusCode": status_code,
        "headers": {"Content-Type": "application/json", "Allow-Origin": "*"},
        "body": json.dumps(body, cls=DecimalEncoder)
    }

import functools
import warnings

def deprecated(reason="This function is deprecated."):
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            warnings.warn(
                f"Function {func.__name__} is deprecated: {reason}",
                category=DeprecationWarning,
                stacklevel=2
            )
            return func(*args, **kwargs)
        return wrapper
    return decorator

def new_id(prefix: str, ksuid_func: function, test_flag: bool | None = None) -> str:
    head = f"{prefix}_" + ("test_" if test_flag else "")
    return head + str(ksuid_func())