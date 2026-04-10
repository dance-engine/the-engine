## python libraries
import os
import json
import boto3 # not a python library but is included in lambda without need to install it
import logging
import sys
import requests
import smtplib
import traceback
from email.message import EmailMessage

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
MAILDEV_IP = os.environ.get('MAILDEV_IP', "localhost")

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

def _render_tempalte_preview(request: EmailJob):
    logger.info(f"Rendering template preview for template_id: {request.template} with params: {request.params}")

    organisation_settings = get_organisation_settings(request.organisation)
    branding_params = {"css_vars": getattr(organisation_settings, "css_vars", _default_branding_params()), 
                       "brand_name": getattr(organisation_settings, "name", "Dance Engine Ticketing"),
                       "brand_logo_url": organisation_settings.logo}
    try:
        template_params = {**request.params, **branding_params}

        try:
            url = "https://api.brevo.com/v3/smtp/template/preview"
            headers = {
                "api-key": BREVO_API_KEY,
                "Content-Type": "application/json"
            }
            payload = {
                "email": "root@engine.dance",
                "templateId": request.template.value,
                "params": template_params,
            }

            response = requests.post(url, headers=headers, json=payload)
            return response.json()
        except Exception as e:
            logger.error("Exception when calling Brevo API: %s\n", e)
            return e
    except Exception as e:
        logger.error("Unexpected error occured: %s\n", e)
        return e    

def _send_email_preview(request: EmailJob, html_content, subject):
    '''    
    Send email in preview mode
    '''    

    port = 1025
    smtp_server = MAILDEV_IP
    login = "987p6absdkjl"
    password = "875sadv&oa8s7td"

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = "ticketing@danceengine.co.uk"
    message["To"] = request.recipient.email
    message.set_content("HTML preview attached. Open this email in an HTML-capable client.")
    message.add_alternative(html_content, subtype="html", charset="utf-8")

    # Send the email using smtplib
    try:
        with smtplib.SMTP(smtp_server, port) as server:
            server.login(login, password)
            server.send_message(message)
        logger.info("Email sent successfully in preview")
        return "Preview Success"
    except Exception as e:
        logger.error("Failed to send email in preview: %s", e)
        logger.error(f"{traceback.format_exc()}")
        return e


def send_email(request: EmailJob):
    logger.info(f"Sending email with details: {request}")

    organisation_settings = get_organisation_settings(request.organisation)
    branding_params = {"css_vars": getattr(organisation_settings, "css_vars", _default_branding_params()), 
                       "brand_name": getattr(organisation_settings, "name", "Dance Engine Ticketing"),
                       "brand_logo_url": organisation_settings.logo}

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

def process_email_job(request: EmailJob):
    logger.info("Processing email job %s for organisation %s", request.job_id, request.organisation)

    if STAGE_NAME == "preview":
        preview_content = _render_tempalte_preview(request)
        if isinstance(preview_content, Exception):
            logger.error("Template preview generation failed for job %s: %s", request.job_id, str(preview_content))
            return preview_content

        preview_send_result = _send_email_preview(
            request,
            preview_content.get("html", ""),
            preview_content.get("subject", "Email Preview"),
        )
        return preview_send_result

    return send_email(request)

def is_retryable_email_result(result) -> bool:
    if isinstance(result, Exception):
        return True

    if isinstance(result, requests.Response):
        return result.status_code >= 500

    return False

def lambda_handler(event, context):

    logger.info("Received event: %s", json.dumps(event, indent=2, cls=DecimalEncoder))

    if event.get("Records") and event.get("Records", [])[0].get("eventSource") == "aws:sqs":
        logger.info("Triggered by SQS")
        batch_failures = []

        for record in event.get("Records", []):
            try:
                parsed_message = parse_event(record.get("body"))
                validated_request = EmailJob.model_validate(parsed_message)
                result = process_email_job(validated_request)

                if is_retryable_email_result(result):
                    logger.error("Email job failed for record %s with retryable result: %s", record.get("messageId"), str(result))
                    batch_failures.append({"itemIdentifier": record.get("messageId")})
                else:
                    logger.info("Email job completed for record %s", record.get("messageId"))
            except Exception:
                logger.error("Failed processing SQS email record\n%s", traceback.format_exc())
                batch_failures.append({"itemIdentifier": record.get("messageId")})

        return {"batchItemFailures": batch_failures}
    
    else:
        logger.info("Received EventBridge event: %s", json.dumps(event, indent=2, cls=DecimalEncoder))
        logger.error("Unsupported event source")
