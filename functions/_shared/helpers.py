import json
from _shared.DecimalEncoder import DecimalEncoder
import logging
from boto3.dynamodb.conditions import Key

## logger setup
logger = logging.getLogger()
logger.setLevel("INFO")

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

def get_organisation_settings(organisationSlug: str, db, OrganisationModel, ORG_TABLE_NAME_TEMPLATE):
    TABLE_NAME = ORG_TABLE_NAME_TEMPLATE.replace("org_name",organisationSlug)
    table = db.Table(TABLE_NAME)
    logger.info(f"Getting settings of {organisationSlug} from {TABLE_NAME} / ")
    blank_model = OrganisationModel(name="blank", organisation=organisationSlug)
    logger.info(f"Querying DynamoDB for settings of {blank_model.model_dump(mode='json')}")

    try:
        result = blank_model.query_gsi(
            table=table,
            index_name="IDXinv", 
            key_condition=Key('PK').eq(f'{blank_model.PK}') & Key('SK').eq(f'{blank_model.SK}'),
            assemble_entites=True
            )
        logger.info(f"Found settings for {organisationSlug}: {result}")
    except Exception as e:
        logger.error(f"DynamoDB query failed to get settings for {organisationSlug}: {e}")
        raise Exception

    return OrganisationModel.model_validate(result)