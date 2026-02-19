import sys
import os

import json
import logging
import boto3
import traceback
from datetime import datetime, timezone
from botocore.exceptions import ClientError
from boto3.dynamodb.conditions import Key

from ksuid import KsuidMs # utils layer

sys.path.append(os.path.dirname(__file__))
from _shared.parser import parse_event
from _shared.DecimalEncoder import DecimalEncoder
from _shared.naming import getOrganisationTableName
from _shared.helpers import make_response
from _pydantic.EventBridge import trigger_eventbridge_event, EventType, Action, triggerEBEvent # pydantic layer
from _pydantic.dynamodb import VersionConflictError # pydantic layer
from _pydantic.models.customers_models import CreateCustomerRequest, UpdateCustomerRequest, CustomerListResponse
from _pydantic.models.models_extended import CustomerModel

logger = logging.getLogger()
logger.setLevel("INFO")

db = boto3.resource("dynamodb")
eventbridge = boto3.client('events')

STAGE_NAME = os.environ.get('STAGE_NAME') or (_ for _ in ()).throw(KeyError("Environment variable 'STAGE_NAME' not found"))
ORG_TABLE_NAME_TEMPLATE = os.environ.get('ORG_TABLE_NAME_TEMPLATE') or (_ for _ in ()).throw(KeyError("Environment variable 'ORG_TABLE_NAME_TEMPLATE' not found"))

def create_customer(request_data: CreateCustomerRequest, organisation_slug: str, actor: str = "unknown"):
    logger.info(f"Create Customer: {request_data}")

    TABLE_NAME = ORG_TABLE_NAME_TEMPLATE.replace("org_name",organisation_slug)
    table = db.Table(TABLE_NAME)
    logger.info(f"Adding customer for {organisation_slug} into {TABLE_NAME}")

    current_time = datetime.now(timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z')
    logger.info(f"Current Time: {current_time}")

    # clientKsuid = KsuidMs.from_base62(event_data.get('ksuid'))

    customer_data  = request_data.customer
    customer_model = CustomerModel.model_validate({
        **customer_data.model_dump(mode="json", exclude_unset=True),
        "ksuid": str(customer_data.ksuid) if customer_data.ksuid else str(KsuidMs()),
        "organisation": organisation_slug,
        "created_at": current_time,
        "updated_at": current_time,
        "version": customer_data.version or 0
    })

    try:
        customer_response = customer_model.upsert(table, ["created_at", "ksuid"])
        trigger_eventbridge_event(eventbridge, 
                    source="dance-engine.core", 
                    resource_type=EventType.customer,
                    action=Action.created,
                    organisation=organisation_slug,
                    resource_id=customer_model.ksuid,
                    data=customer_model.model_dump(mode="json", exclude_unset=True)
        )
        make_response(201,{
            "message": "Customer created successfully.",
            "customer": customer_model.model_dump(mode="json", exclude_unset=True)
            }
        )
    except VersionConflictError as e:
        logger.error(f"Version Conflict")
        return make_response(409, {
            "message": "Version conflict",
            "resource": e.model.PK,
            "your_version": e.incoming_version
        })
    except Exception as e:
        logger.error("Unexpected error: %s", str(e))
        logger.error(traceback.format_exc())
        return make_response(500, {"message": "Something went wrong."})

def update_customer(request_data: UpdateCustomerRequest, organisation_slug: str, actor: str = "unknown"):
    logger.info(f"Updating Customer: {request_data.model_dump}")

    TABLE_NAME = ORG_TABLE_NAME_TEMPLATE.replace("org_name",organisation_slug)
    table = db.Table(TABLE_NAME)
    logger.info(f"Updating customer for {organisation_slug} into {TABLE_NAME}")

    current_time = datetime.now(timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z')
    logger.info(f"Current Time: {current_time}")

    customer_data = request_data.customer

    try:
        customer_model = CustomerModel.model_validate({
            **customer_data.model_dump(mode="json", exclude_unset=True),
            "updated_at":current_time,
            "organisation": organisation_slug,
        })

        customer_response = customer_model.upsert(table, ["created_at"])
        trigger_eventbridge_event(eventbridge, 
                                  source="dance-engine.core", 
                                  resource_type=EventType.customer,
                                  action=Action.updated,
                                  organisation=organisation_slug,
                                  resource_id=customer_model.PK,
                                  data=request_data.model_dump(mode="json"),
                                  meta={"accountId":actor})
        return make_response(201, {
            "message": "Customer updated successfully.",
            "event": customer_model.model_dump(mode="json"),
        })
    except VersionConflictError as e:
        logger.error(f"Version Conflict")
        return make_response(409, {
            "message": "Version conflict",
            "resource": e.model.PK,
            "your_version": e.incoming_version
        })
    except ValueError as e:
        return make_response(400, {
            "message": "Invalid update request",
            "error": str(e)
        })    
    except Exception as e:
        logger.error("Unexpected error: %s", str(e))
        logger.error(traceback.format_exc())
        return make_response(500, {"message": "Something went wrong."})
    
def get_customers(organisationSlug):
    TABLE_NAME = ORG_TABLE_NAME_TEMPLATE.replace("org_name",organisationSlug)
    table = db.Table(TABLE_NAME)
    logger.info(f"Getting Customers for {organisationSlug} from {TABLE_NAME}")
    blank_model = CustomerModel(name="blank", organisation=organisationSlug)

    try:
        customers = blank_model.query_gsi(
            table=table,
            index_name="gsi1",
            key_condition=Key("gsi1PK").eq(blank_model.gsi1PK) & Key("gsi1SK").begins_with(f"{blank_model.gsi1SK.split('#')[0]}#"),
        )
        logger.info(f"Found customers for {organisationSlug}: {customers}")
    except Exception as e:
        logger.error(f"DynamoDB query failed to get customers for {organisationSlug}: {e}")
        raise Exception

    return customers

def get_single_customer(organisationSlug, customerId):
    TABLE_NAME = ORG_TABLE_NAME_TEMPLATE.replace("org_name",organisationSlug)
    table = db.Table(TABLE_NAME)
    logger.info(f"Getting customer {customerId} for {organisationSlug} from {TABLE_NAME}")
    blank_model = CustomerModel(email=customerId, name="blank", organisation=organisationSlug)

    try:
        customer = blank_model.query_gsi(
            table=table, 
            key_condition=Key("PK").eq(f'{blank_model.PK}') & Key("SK").eq(f'{blank_model.SK}'),
        )
        logger.info(f"Found customer for {organisationSlug}: {customer}")
    except ClientError as e:
        if e.response['Error']['Code'] == 'ResourceNotFoundException':
            logger.error(f"Customer not found for {organisationSlug}: {e}")
            return None
        else:
            raise
    except ValueError as e:
        logger.error(f"Customer not found for {organisationSlug}: {e}")
        return None
    
    except Exception as e:
        logger.error(f"DynamoDB query failed to get customers for {organisationSlug}: {e}")
        raise Exception
    
    return customer if customer else None

def private_handler(event, context):
    try:
        logger.info("Received event: %s", json.dumps(event, indent=2, cls=DecimalEncoder))
        parsed_event = parse_event(event)
        http_method  = event['requestContext']["http"]["method"]

        organisationSlug = event.get("pathParameters", {}).get("organisation")
        customerId          = event.get("pathParameters", {}).get("ksuid",None)
        is_public        = event.get("rawPath", "").startswith("/public")
        actor            = event.get("requestContext", {}).get("accountId", "unknown")

        # POST /{organisation}/customers
        if http_method == "POST":
            validated_event = CreateCustomerRequest(**parsed_event)
            return create_customer(validated_event, organisationSlug, actor)

        elif http_method == "GET":
            logger.info(f"{organisationSlug}:{customerId}")
            response_cls = CustomerListResponse

            customers = [get_single_customer(organisationSlug,customerId)] if customerId else get_customers(organisationSlug)
            if customers is None:
                return make_response(404, {"message": "Customer not found."})
            
            resposne = response_cls(customers=customers)
            return make_response(200, resposne.model_dump(mode="json", exclude_none=True))
        
        elif http_method == "PUT":
            if not customerId:
                return make_response(404, {"message": "Missing event ID in request"})
            validated_request = UpdateCustomerRequest(**parsed_event)
            return update_customer(validated_request, organisationSlug, actor)
        else:
            return make_response(405, {"message": "Method not allowed."})
        
    except ValueError as e:
        logger.error("Validation error: %s", str(e))
        logger.error(traceback.format_exc())
        error_summary = ""
        for error in e.errors():
            error_summary += f"Field: { error['loc']} Message: {error['msg']}, Type: {error['type']}"
        return make_response(400,{"message": "Validation error.", "error": str(e)})
    except Exception as e:
        logger.error("Unexpected error: %s", str(e))
        logger.error(traceback.format_exc())
        return make_response(500, {"message": "Internal server error.", "error": str(e)})