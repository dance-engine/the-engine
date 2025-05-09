import json
from random import randint
import datetime
import boto3
import os
import logging
from decimal import Decimal
import time
import sib_api_v3_sdk
from sib_api_v3_sdk.rest import ApiException

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
                'DetailType': 'TestType',
                'Source': 'dance-engine.test',
            },
        ]
    )
    # response = payload
    return {'statusCode':200, 'body': json.dumps(response) }


def receive_handler(event,context):
    logger.info("Event:\n%s\n\nContext:\n%s", event, context),
    # Configure API key authorization: api-key
    configuration = sib_api_v3_sdk.Configuration()
    configuration.api_key['api-key'] = os.environ.get("BREVO_KEY")
    # Uncomment below to setup prefix (e.g. Bearer) for API key, if needed
    # configuration.api_key_prefix['api-key'] = 'Bearer'
    # Configure API key authorization: partner-key
    # configuration = sib_api_v3_sdk.Configuration()
    # configuration.api_key['partner-key'] = os.environ.get("BREVO_KEY")
    # Uncomment below to setup prefix (e.g. Bearer) for API key, if needed
    # configuration.api_key_prefix['partner-key'] = 'Bearer'

    # create an instance of the API class
    # api_instance = sib_api_v3_sdk.AccountApi(sib_api_v3_sdk.ApiClient(configuration))
    api_instance = sib_api_v3_sdk.ContactsApi(sib_api_v3_sdk.ApiClient(configuration))
    companiApiInstance = sib_api_v3_sdk.CompaniesApi(sib_api_v3_sdk.ApiClient(configuration))


    create_contact = sib_api_v3_sdk.CreateContact(
        email="adam.bardsley@gmail.com",
        attributes={"SMS": "+4407734774125", "FIRSTNAME": "Adam", "LASTNAME": "Test", "JOB_TITLE": "Developer"},
        list_ids=[2],
        email_blacklisted=False,
        sms_blacklisted=False,
        update_enabled=True
    )

    comanyId = "680ae75990bd0d7d52c1e478"


    try:
        # Get your account informations, plans and credits details
        # api_response = api_instance.get_account()
        api_response = api_instance.create_contact(create_contact)
        logger.info("API Response:\n%s", api_response),

        api_response = companiApiInstance.companies_link_unlink_id_patch(comanyId,{
            "linkContactIds": [1]
        })
        logger.info("API Response:\n%s", api_response),
    except ApiException as e:
        print("Exception when calling AccountApi->get_account: %s\n" % e)
    return True



