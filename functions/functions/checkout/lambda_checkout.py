## python libraries
import os
import json
import boto3 # not a python library but is included in lambda without need to install it
import logging
import traceback
import sys
from datetime import datetime, timezone
import time

## installed packages
from pydantic import AfterValidator, ValidationError # layer: pydantic
import stripe # layer: stripe

## custom scripts
sys.path.append(os.path.dirname(__file__))
from _shared.parser import parse_event
from _shared.DecimalEncoder import DecimalEncoder
from _shared.helpers import make_response
from _pydantic.models.checkout_models import CreateCheckoutRequest, CheckoutObjectPublic, LineItemObjectPublic
from _pydantic.models.models_extended import EventModel
from _pydantic.dynamodb import transact_upsert, VersionConflictError
#from _pydantic.EventBridge import triggerEBEvent, trigger_eventbridge_event, EventType, Action # pydantic layer

## logger setup
logger = logging.getLogger()
logger.setLevel("INFO")

## aws resources an clients
db = boto3.resource("dynamodb")

## ENV variables
# will throw an error if the env variable does not exist
STAGE_NAME = os.environ.get('STAGE_NAME') or (_ for _ in ()).throw(KeyError("Environment variable 'STAGE_NAME' not found"))
ORG_TABLE_NAME_TEMPLATE = os.environ.get('ORG_TABLE_NAME_TEMPLATE') or (_ for _ in ()).throw(KeyError("Environment variable 'ORG_TABLE_NAME_TEMPLATE' not found"))
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY') or (_ for _ in ()).throw(KeyError("Environment variable 'STRIPE_API_KEY' not found"))

def start(validated_request: CreateCheckoutRequest, organisation_slug: str, actor: str):
    logger.info("Starting checkout process for organisation: %s", organisation_slug)

    # Check that it is a ticket that is being bought for (only support tickets rn)
    # What event is the ticket being bought for?
    # Try to add one to reserved on the event in db with condition expression that sold+reserved < capacity
    # If that works, create the stripe checkout
    # If it doesn't work, return error that tickets are sold out

    TABLE_NAME = ORG_TABLE_NAME_TEMPLATE.replace("org_name",organisation_slug)
    table = db.Table(TABLE_NAME)

    current_time = datetime.now(timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z')
    logger.info(f"Current Time: {current_time}")

    if not validated_request.checkout or len(validated_request.checkout) == 0:
        return make_response(400, {"message": "No checkout request provided."})
    
    checkout = validated_request.checkout[0]
    ignored_checkouts = validated_request.checkout[1:] if len(validated_request.checkout) > 1 else []

    line_items = checkout.line_items or []
    if len(line_items) == 0:
        return make_response(400, {
            "message": "Checkout has no line_items.",
            "checkout": checkout.model_dump_json(),
            "ignored_checkouts": [c.model_dump_json() for c in ignored_checkouts]
        })
    
    event_ksuids = list(set(item.event_ksuid for item in line_items if hasattr(item, 'event_ksuid')))

    if len(event_ksuids) != 1:
        return make_response(400, {
                "message": "All line items must be for the same event (checkout is currently only supported for one event at a time).",
                "checkout": checkout.model_dump_json(), 
                "ignored_checkouts": [c.model_dump_json() for c in ignored_checkouts] })
    
    event_ksuid = event_ksuids[0]
    
    for item in line_items:
        if item.quantity > 1:
            return make_response(400, {
                "message": "Only quantity of 1 per line item is currently supported.",
                "checkout": checkout.model_dump_json(),
                "ignored_checkouts": [c.model_dump_json() for c in ignored_checkouts]
            })

    condition_expr = "attribute_exists(#remaining_capacity) AND #remaining_capacity >= :one"

    extra_names = {
        "#remaining_capacity": "remaining_capacity"
    }
    extra_values = {
        ":one": 1,
    }

    try:
        event_models = [
            EventModel.model_validate({
                "name": "placeholder", 
                "organisation": organisation_slug,
                "ksuid": event_ksuid,
                "reserved": 1,
                "remaining_capacity": -1,
                "updated_at": current_time
            })
        ]

        successful, failed = transact_upsert(
            table,
            event_models,
            condition_expression=condition_expr,
            add_fields={"reserved", "remaining_capacity"},
            extra_expression_attr_names=extra_names,
            extra_expression_attr_values=extra_values,
            version_override=True,
            only_set_once={"created_at", "number_sold", "organisation", "ksuid", "name", "event_slug"}
        )

        if failed:
            return make_response(409, {
                "message": "Unable to reserve tickets for one or more events (likely at capacity).",
                "events_attempted": event_ksuids,
                "ignored_checkouts": ignored_checkouts if ignored_checkouts else None
            })

    except VersionConflictError as e:
        logger.error(f"Version Conflict")
        return make_response(409, {
            "message": "Version conflict",
            "resource": [m.PK for m in e.models],
            "your_version": e.incoming_version
        })
    except ValidationError as e:
        logger.error("Validation error: %s", str(e))
        logger.error(traceback.format_exc())
        return make_response(400, {
            "message": "Invalid request",
            "error": str(e)
        })
    except ValueError as e:
        return make_response(400, {
            "message": "Invalid request",
            "error": str(e)
        })
    except Exception as e:
        logger.error("Reservation transaction failed: %s", str(e))
        logger.error("Unexpected error: %s", str(e))
        logger.error(traceback.format_exc())
        return make_response(500, {
            "message": "Something went wrong.", 
            "error": str(e)})
    
    try:
        stripe.api_key = STRIPE_API_KEY

        stripe_line_items = [
            {"price": item.price_id, "quantity": item.quantity} for item in line_items
        ]

        expires_at = int(time.time()) + 30 * 60  # 30 minutes 

        session = stripe.checkout.Session.create(
            mode="payment",
            payment_method_types=["card"],
            line_items=stripe_line_items,
            payment_intent_data={
                "application_fee_amount": checkout.application_fee_amount if checkout.application_fee_amount else 0
            },
            success_url=checkout.success_url,
            cancel_url=checkout.cancel_url,
            expires_at=expires_at,
            discounts=[{"coupon": checkout.coupon_code}] if checkout.coupon_code else None,
            allow_promotion_codes = True,
            stripe_account = checkout.stripe_account_id
        )

        return make_response(201, {
            "message": "Checkout session created successfully.",
            "checkout": {
                "stripe_session_id": session.get("id"),
                "stripe_checkout_url": session.get("url"),
                "expires_at": expires_at,
            },
            "ignored_checkouts": ignored_checkouts if ignored_checkouts else None
        })
    
    except Exception as e:
        logger.error("Stripe checkout session creation failed: %s", str(e))
        logger.error(traceback.format_exc())

        try:
            event_models_rollback = [
                EventModel.model_validate({
                    "name": "placeholder", 
                    "organisation": organisation_slug,
                    "ksuid": event_ksuid,
                    "reserved": -1,
                    "remaining_capacity": 1,
                    "updated_at": current_time
                })
            ]

            transact_upsert(
                table,
                event_models,
                condition_expression=condition_expr,
                add_fields={"reserved", "remaining_capacity"},
                extra_expression_attr_names=extra_names,
                extra_expression_attr_values=extra_values,
                version_override=True,
                only_set_once={"created_at", "number_sold", "organisation", "ksuid", "name", "event_slug"}
            )
        except Exception as rb_e:
            logger.error("Rollback failed (reserved may be stranded): %s", str(rb_e))
            logger.error(traceback.format_exc())

        return make_response(500, {
            "message": "Failed to create Stripe checkout session.",
            "error": str(e),
            "note": "Reservation rollback was attempted.",
            "ignored_checkouts": ignored_checkouts if ignored_checkouts else None
        })

def lambda_handler(event, context):
    try:
        logger.info("Received event: %s", json.dumps(event, indent=2, cls=DecimalEncoder))
        parsed_event = parse_event(event)
        http_method  = event['requestContext']["http"]["method"]

        organisationSlug = event.get("pathParameters", {}).get("organisation")
        is_public        = event.get("rawPath", "").startswith("/public")
        actor            = event.get("requestContext", {}).get("accountId", "unknown")

        # POST /{organisation}/checkout/start
        if http_method == "POST":
            validated_request = CreateCheckoutRequest(**parsed_event)
            return start(validated_request, organisationSlug, actor)
        else:
            return make_response(405, {"message": "Method not implemented."})
    except ValueError as e:
        logger.error("Validation error: %s", str(e))
        logger.error(traceback.format_exc())
        return make_response(400,{"message": "Validation error.", "error": str(e)})
    except Exception as e:
        logger.error("Unexpected error: %s", str(e))
        logger.error(traceback.format_exc())
        return make_response(500, {"message": "Internal server error.", "error": str(e)})
    