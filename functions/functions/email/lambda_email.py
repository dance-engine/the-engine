## python libraries
import os
import json
import boto3 # not a python library but is included in lambda without need to install it
import logging
import sys
import requests

## installed packages
from boto3.dynamodb.conditions import Key
# from botocore.exceptions import ClientError
#from ksuid import KsuidMs # layer: utils

## custom scripts
sys.path.append(os.path.dirname(__file__))
from _shared.parser import parse_event
from _shared.DecimalEncoder import DecimalEncoder
from _pydantic.models.models_extended import OrganisationModel
from _pydantic.email_models import EmailTemplates, JobTypes, EmailRecipient, EmailJob

## logger setup
logger = logging.getLogger()
logger.setLevel("INFO")

## aws resources an clients
db = boto3.resource("dynamodb")

## ENV variables
# will throw an error if the env variable does not exist
STAGE_NAME = os.environ.get('STAGE_NAME') or (_ for _ in ()).throw(KeyError("Environment variable 'STAGE_NAME' not found"))
BREVO_API_KEY = os.environ.get('BREVO_API_KEY') or (_ for _ in ()).throw(KeyError("Environment variable 'BREVO_API_KEY' not found"))
ORG_TABLE_NAME_TEMPLATE = os.environ.get('ORG_TABLE_NAME_TEMPLATE') or (_ for _ in ()).throw(KeyError("Environment variable 'ORG_TABLE_NAME_TEMPLATE' not found"))

def _default_branding_params():
    return {
        "brand_background_colour": "000",
        "brand_logo_url": ""
    }

def get_organisation_settings(organisationSlug: str) -> OrganisationModel:
    TABLE_NAME = ORG_TABLE_NAME_TEMPLATE.replace("org_name",organisationSlug)
    table = db.Table(TABLE_NAME)
    logger.info(f"Getting settings of {organisationSlug} from {TABLE_NAME} / ")
    blank_model = OrganisationModel(name="blank", organisation=organisationSlug)

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

def send_email(request: EmailJob):
    logger.info(f"Sending email with details: {request}")

    organisation_settings = get_organisation_settings(request.organisation)
    branding_params = {"css_vars": organisation_settings.css_vars} if organisation_settings.css_vars else _default_branding_params()    

    try:
        template_params = {**request.params, **branding_params}

        try:
            logger.info("Attempting to send email via Brevo")

            url = "https://api.brevo.com/v3/smtp/email"
            headers = {
                "api-key": BREVO_API_KEY,
                "Content-Type": "application/json"
            }
            payload = {
                "to": [{"email": request.recipient.email, "name": request.recipient.name}],
                "templateId": request.template.value,
                "params": template_params,
            }

            response = requests.post(url, headers=headers, json=payload)         
            return response
        except Exception as e:
            logger.error("Exception when calling Brevo API: %s\n", e)
            return e
    except Exception as e:
        logger.error("Unexpected error occured: %s\n", e)
        return e

def lambda_handler(event, context):

    logger.info("Received event: %s", json.dumps(event, indent=2, cls=DecimalEncoder))

    if event.get("Records") and event.get("Records", [])[0].get("eventSource") == "aws:sqs":
        logger.info("Triggered by SQS")
        parsed_message = parse_event(event.get("Records", [])[0].get("body"))
        send_email(EmailJob.model_validate(parsed_message))
        return 
    
    else:
        logger.info("Received EventBridge event: %s", json.dumps(event, indent=2, cls=DecimalEncoder))
        logger.error("Unsupported event source")