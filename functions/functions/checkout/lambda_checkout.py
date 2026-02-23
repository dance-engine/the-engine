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
from _pydantic.dynamodb import transact_upsert
from _pydantic.EventBridge import trigger_eventbridge_event, EventType, Action # pydantic layer

## logger setup
logger = logging.getLogger()
logger.setLevel("INFO")

## aws resources an clients
db = boto3.resource("dynamodb")
eventbridge = boto3.client('events')

## ENV variables
# will throw an error if the env variable does not exist
STAGE_NAME = os.environ.get('STAGE_NAME') or (_ for _ in ()).throw(KeyError("Environment variable 'STAGE_NAME' not found"))
ORG_TABLE_NAME_TEMPLATE = os.environ.get('ORG_TABLE_NAME_TEMPLATE') or (_ for _ in ()).throw(KeyError("Environment variable 'ORG_TABLE_NAME_TEMPLATE' not found"))
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY') or (_ for _ in ()).throw(KeyError("Environment variable 'STRIPE_API_KEY' not found"))

def _event_capacity_mutation(table, *,
                             organisation_slug: str,
                             event_ksuid: str,
                             reserved_delta: int,
                             remaining_capacity_delta: int,
                             current_time: str,
                             require_remaining_at_least: int | None = None,
                             number_sold_delta: int | None = None):
    """

    """
    extra_names = {"#remaining_capacity": "remaining_capacity"}
    extra_values = {}
    add_fields = {"reserved", "remaining_capacity"}

    condition_expr = None
    if require_remaining_at_least is not None:
        condition_expr = "attribute_exists(#remaining_capacity) AND #remaining_capacity >= :min"
        extra_values[":min"] = int(require_remaining_at_least)

    model_data = {
            "name": "placeholder", 
            "organisation": organisation_slug,
            "ksuid": event_ksuid,
            "reserved": int(reserved_delta),
            "remaining_capacity": int(remaining_capacity_delta),
            "updated_at": current_time
        }
    
    if number_sold_delta is not None:
        model_data["number_sold"] = int(number_sold_delta)
        add_fields.add("number_sold")

    event_models = [EventModel.model_validate(model_data)]

    result = transact_upsert(
        table,
        event_models,
        condition_expression=condition_expr,
        add_fields=add_fields,
        extra_expression_attr_names=extra_names,
        extra_expression_attr_values=extra_values,
        version_override=True,
        only_set_once={"created_at", "organisation", "ksuid", "name", "event_slug"}
    )
    return result

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
    
    checkout: CheckoutObjectPublic = validated_request.checkout[0]
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
        if item.quantity and item.quantity > 1:
            return make_response(400, {
                "message": "Only quantity of 1 per line item is currently supported.",
                "checkout": checkout.model_dump_json(),
                "ignored_checkouts": [c.model_dump_json() for c in ignored_checkouts]
            })
        
    collect_customer_on_stripe = bool(checkout.collect_customer_on_stripe)

    if not collect_customer_on_stripe and not checkout.name and not checkout.email:
        return make_response(400, {
            "message": "Customer information must be provided if not collecting on Stripe. Set collect_customer_on_stripe to true or provide name and email.",
            "checkout": checkout.model_dump_json(),
            "ignored_checkouts": [c.model_dump_json() for c in ignored_checkouts]
        })

    try:
        result = _event_capacity_mutation(
            table, 
            organisation_slug=organisation_slug, 
            event_ksuid=event_ksuid, 
            reserved_delta=1, 
            remaining_capacity_delta=-1, 
            current_time=current_time, 
            require_remaining_at_least=1
        )

        logger.info(f"Event capacity mutation result: {result}")

        if result.failed:
            f = result.failures[0]
            if f.inferred == "remaining_capacity_insufficient":
                return make_response(409, {"message": "Event is at capacity."})
            if f.inferred == "version_conflict":
                return make_response(409, {"message": "Version conflict."})
            if f.code == "throttled":
                return make_response(503, {"message": "Database throttled, retry."})
            return make_response(409, {
                "message": "Reservation failed.",
                "reason": f.code,
                "dynamodb_code": f.dynamodb_code,
                "detail": f.message,
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

        stripe_customer_fields = {}
        extra_metadata = {}
        if collect_customer_on_stripe:
            stripe_customer_fields = {
                "phone_number_collection": {"enabled": True},
                "custom_fields": [
                    {
                        "key": "full_name",
                        "type": "text",
                        "label": {"type": "custom", "custom": "Full Name"}
                    }
                ]
            }
        else:
            stripe_customer_fields = { "customer_email": checkout.email }
            extra_metadata = {
                "customer_name": checkout.name,
                "customer_email": checkout.email
            }

        stripe_line_items = [
            {
                "quantity": item.quantity or 1,
                "price": item.price_id,
                "metadata": {
                    "ksuid": item.ksuid,
                    "entity_type": item.entity_type,
                    "name": item.name,
                    "includes": item.includes,
                }
            } for item in line_items
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
            stripe_account = checkout.stripe_account_id,
            metadata={"organisation": organisation_slug, "event_ksuid": event_ksuid, **extra_metadata},
            **stripe_customer_fields
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
            _event_capacity_mutation(
                table, 
                organisation_slug=organisation_slug, 
                event_ksuid=event_ksuid, 
                reserved_delta=-1, 
                remaining_capacity_delta=1, 
                current_time=current_time
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
    
def unreserve(stripe_event: dict):
    logger.info("Unreserving tickets for expired checkout session.")
    
    detail = stripe_event.get("detail", {})
    data_obj = detail.get("data", {}).get("object", {})
    
    metadata = data_obj.get("metadata", {}) or {}
    organisation_slug = metadata.get("organisation")
    event_ksuid = metadata.get("event_ksuid")

    if not organisation_slug or not event_ksuid:
        logger.warning("Missing metadata for unreserve. Can't map session to an event.")
        return make_response(400, {
            "message": "Missing metadata to unreserve reservation.",
            "required": ["metadata.organisation", "metadata.event_ksuid"],
        })
    
    TABLE_NAME = ORG_TABLE_NAME_TEMPLATE.replace("org_name",organisation_slug)
    table = db.Table(TABLE_NAME)

    current_time = datetime.now(timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z')
    logger.info(f"Current Time: {current_time}")

    try:
        result = _event_capacity_mutation(
            table,
            organisation_slug=organisation_slug,
            event_ksuid=event_ksuid, 
            reserved_delta=-1, 
            remaining_capacity_delta=1, 
            current_time=current_time 
        ) 
        if result.failed: 
            f = result.failures[0]
            if f.inferred == "remaining_capacity_insufficient":
                return make_response(409, {"message": "Event is at capacity."})
            if f.inferred == "version_conflict":
                return make_response(409, {"message": "Version conflict."})
            if f.code == "throttled":
                return make_response(503, {"message": "Database throttled, retry."})
            return make_response(409, {
                "message": "Reservation failed.",
                "reason": f.code,
                "dynamodb_code": f.dynamodb_code,
                "detail": f.message,
            })
        
        logger.info("Successfully unreserved tickets for event %s.", event_ksuid)
        return make_response(200, {
            "message": "Successfully unreserved tickets.",
            "event_ksuid": event_ksuid
        }) 
    except Exception as e:
        logger.error("Error during unreservation: %s", str(e))
        logger.error(traceback.format_exc())
        return make_response(500, {
            "message": "Error during unreservation.",
            "error": str(e),
            "event_ksuid": event_ksuid
        })
    
def completed(stripe_event: dict):
    logger.info("Handling completed checkout session.")

    # What event was the ticket sold for?
    # Mutate the reserve (-1) and number_sold (+1) on the event. Remaining capacity does not need to be changed.
    # Put an EventBridge event out to say a ticket has been sold including some details about it.
    # Done

    try:
        detail = stripe_event.get("detail", {})
        data_obj = detail.get("data", {}).get("object", {})

        session_id = data_obj.get("id")

        try:
            stripe.api_key = STRIPE_API_KEY
            stripe_checkout = stripe.checkout.Session.retrieve(session_id, expand=["line_items"], stripe_account = detail.get("account"),)
            logger.info("Retrieved Stripe checkout session: %s", stripe_checkout)
        except (stripe.error.InvalidRequestError, stripe.error.APIConnectionError) as e:
            logger.error("Failed to retrieve Stripe checkout session: %s", str(e))
            logger.error(traceback.format_exc())
            return make_response(500, {
                "message": "Internal Server Error: Failed to retrieve Stripe checkout session.",
                "error": str(e)
            })

        metadata = stripe_checkout.get("metadata", {})
        organisation_slug = metadata.get("organisation")
        event_ksuid = metadata.get("event_ksuid")
        
        #! Catch an error where metadat is missing
        logger.info(f"Organisation: {organisation_slug}, Event KSUID: {event_ksuid}")

        TABLE_NAME = ORG_TABLE_NAME_TEMPLATE.replace("org_name",organisation_slug)
        table = db.Table(TABLE_NAME)

        current_time = datetime.now(timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z')
        logger.info(f"Current Time: {current_time}")

        result = _event_capacity_mutation(
            table,
            organisation_slug=organisation_slug,
            event_ksuid=event_ksuid, 
            reserved_delta=-1, 
            remaining_capacity_delta=0, 
            current_time=current_time,
            number_sold_delta=1
        )

        line_items = [
            {
                "ksuid": it.get("metadata", {}).get("ksuid"),
                "entity_type":  it.get("metadata", {}).get("entity_type"),
                "name":  it.get("metadata", {}).get("name"),
                "includes": it.get("metadata", {}).get("includes")
            } for it in stripe_checkout.get("line_items", {}).get("data", [])
        ]

        name_on_ticket = stripe_checkout.get("custom_fields", [{}])[0].get("text", {}).get("value") if stripe_checkout.get("custom_fields") else metadata.get("customer_name")

        data = {
            "session_id": session_id,
            "event_ksuid": event_ksuid,
            "line_items": line_items,
            "customer_email": stripe_checkout.get("customer_email") or stripe_checkout.get("customer_details", {}).get("email"),
            "name_on_ticket":  name_on_ticket,
        }

        # Put an EventBridge event out to say a ticket has been sold
        trigger_eventbridge_event(eventbridge, 
                            source="dance-engine.core" if not STAGE_NAME == "preview" else "dance-engine.core.preview", 
                            resource_type=EventType.checkout,
                            action=Action.completed,
                            organisation=organisation_slug,
                            resource_id=session_id,
                            data=data)

        return make_response(200, {"message": "Checkout session completed successfully."})

    except Exception as e:
        logger.error("Error handling completed checkout session: %s", str(e))
        logger.error(traceback.format_exc())
        return make_response(500, {"message": "Internal server error.", "error": str(e)})

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
    
def eventbridge_handler(event, context):
    logger.info("Received EventBridge event: %s", json.dumps(event, indent=2, cls=DecimalEncoder))

    type = event.get("detail-type", {})

    if type == "checkout.session.expired":
        logger.info("Handling checkout.session.expired event.")
        return unreserve(event)
    elif type == "checkout.session.completed":
        logger.info("Received checkout.session.completed event.") 
        return completed(event)
    else:
        logger.warning(f"Received event type I can not currently process: {type}")
        return make_response(400, {"message": f"Unhandled event type: {type}"})