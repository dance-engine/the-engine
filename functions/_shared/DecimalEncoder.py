import json
from decimal import Decimal
from json.decoder import JSONDecodeError

class DecimalEncoder(json.JSONEncoder):
    """
    Custom JSON Encoder for Decimal types.

    This encoder extends the default JSONEncoder to handle Decimal objects.
    It converts Decimal instances to either int or float based on their value.

    Methods
    -------
    default(obj):
        Override the default method to encode Decimal objects.
    """
    
    def default(self, obj):
        """
        Override the default method of JSONEncoder.

        Parameters
        ----------
        obj : Any
            The object to encode.

        Returns
        -------
        int or float
            Returns an int if the Decimal is a whole number, 
            a float if it has a fractional part, 
            or the default encoding for other types.
        """
        if isinstance(obj, Decimal):
            if float(obj) == int(obj):
                return int(obj)
            elif str(float(obj)) == str(obj):
                return float(obj)
            else:
                return float(obj)
        return super().default(obj)
