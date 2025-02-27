import json
from random import randint
import datetime
import boto3
import os
import logging
from decimal import Decimal

logger = logging.getLogger()
logger.setLevel("INFO")


def trigger_handler(event, context):
    eventbridge = boto3.client('events')

    response = {
        "brand": "Ford",
        "model": "Mustang",
        "year": 1964
    }
    
    eventbridge.put_events(
        Entries=[
            {
                'Detail': '{ "message": "Hello, EventBridge!" }',
                'DetailType': 'some.type',
                'Source': 'some.pattern',
            },
        ]
    )
    # response = payload
    return {'statusCode':200, 'body': json.dumps(response) }


def receive_handler(event,context):
    logger.info("Event:\n%s\n\nContext:\n%s", event, context),
    return True