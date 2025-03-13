import json
import logging

from ksuid import KsuidMs

logger = logging.getLogger()
logger.setLevel("INFO")

def handler_create(event, context):
    # TODO implement
    logger.info(f"{event},{context}")
    return {"statusCode": 200, "body": json.dumps({'event_ksuid':KsuidMs(), 'message':"Here is your ksuid :)"})}
