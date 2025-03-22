import json
from decimal import Decimal
from json.decoder import JSONDecodeError

class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            if float(obj) == int(obj):
                return int(obj)
            elif str(float(obj)) == str(obj):
                return float(obj)
            else:
                return float(obj)
        return super().default(obj)
