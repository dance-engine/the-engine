import json
from _shared.DecimalEncoder import DecimalEncoder

def make_response(status_code, body):
    return {
        "statusCode": status_code,
        "headers": {"Content-Type": "application/json", "Allow-Origin": "*"},
        "body": json.dumps(body, cls=DecimalEncoder)
    }