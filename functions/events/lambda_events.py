import json
import logging
import os
import time
import re
import uuid
import traceback
from decimal import Decimal
# import boto3
# from boto3.dynamodb.conditions import Key
# from botocore.exceptions import ClientError
from _shared.parser import parse_event, validate_event
from _shared.DecimalEncoder import DecimalEncoder
# import inflection

from ksuid import KsuidMs

logger = logging.getLogger()
logger.setLevel("INFO")

BASE_TABLE_NAME = os.environ.get("EVENT_BASE_TABLE_NAME")


def handler_create(event, context):
    """
    # TODO implement
    Checke for KSUID and create if needed
    Validate Input 
    Store objects in a tranactionalized dynamoDB call
    Return if it worked or not"
    """

    logger.info(f"{event},{context}")
    ORGANISATION = event.get("pathParameters", {}).get("organisation")
    TABLE_NAME = BASE_TABLE_NAME.replace("org_name",ORGANISATION)
    newKsuid = KsuidMs()
    return {"statusCode": 200, "body": json.dumps({'event_ksuid': f"{newKsuid}", 'message':f"Here is your ksuid for :) {ORGANISATION} to use in {TABLE_NAME}"})}
