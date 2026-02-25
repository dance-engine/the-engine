from dataclasses import dataclass, field
from typing import List, Optional
import logging
import json

logger = logging.getLogger()
logger.setLevel("INFO")

@dataclass
class StripeCreated:
    product_id: Optional[str] = None
    price_ids: List[str] = field(default_factory=list)

def _stripe_idempotency_key(*parts: str) -> str:
    raw = "|".join(parts)
    return raw[:250]

def create_stripe_catalog_items(organisation: str, event_id: str, item, stripe):
    """
    """
    created = StripeCreated()
    logger.info(f"{item}")
    # logger.info("Creating Stripe catalog for item: %s", json.dumps(item.model_dump(mode="json", exclude_none=False), indent=2))

    logger.info(f"Creating Stripe catalog for item: {item.name} (event_id={event_id}, organisation={organisation}), type={getattr(item, 'entity_type', 'unknown')}")

    # 1. Create the product
    if not getattr(item, "stripe_product_id", None):
        idem = _stripe_idempotency_key("de", organisation, event_id, item.ksuid, "product")
        product = stripe.Product.create(
            name=item.name,
            description=item.description,
            active=(getattr(item.status, "value", "draft") == "live"),
            metadata={
                "organisation": organisation,
                "event_id": event_id,
                "item_ksuid": item.ksuid,
                "entity_type": getattr(item, "entity_type", "unknown"),
            },
            idempotency_key=idem,
        )
        
        item.stripe_product_id = product.id
        created.product_id = product.id

    # 2. Create the prices
    prices = [
        ("primary",   getattr(item, "primary_price",   None), getattr(item, "primary_price_name",   None)),
        ("secondary", getattr(item, "secondary_price", None), getattr(item, "secondary_price_name", None)),
        ("tertiary",  getattr(item, "tertiary_price",  None), getattr(item, "tertiary_price_name",  None)),
    ]

    for tier, amount_pennies, name in prices:
        if amount_pennies in (None, 0):
            continue

        if getattr(item, f"stripe_{tier}_price_id", None):
            continue

        idem = _stripe_idempotency_key("de", organisation, event_id, item.ksuid, f"price:{tier}:{amount_pennies}")
        price = stripe.Price.create(
            product=item.stripe_product_id,
            unit_amount=int(amount_pennies),
            currency="gbp",
            nickname=name or tier,
            metadata={
                "organisation": organisation,
                "parent_event_id": event_id,
                "item_ksuid": item.ksuid,
                "tier": tier,
            },
            idempotency_key=idem,
        )
        setattr(item, f"stripe_{tier}_price_id", price.id)
        created.price_ids.append(price.id)

        if tier == "primary":
            # backwards compatibility
            item.stripe_price_id = price.id

    return item, created

def rollback_stripe_created(created_list: list[StripeCreated], stripe) -> None:
    for created in reversed(created_list):
        # archive prices
        for pid in created.price_ids:
            try:
                stripe.Price.modify(pid, active=False)
            except Exception as e:
                logger.error(f"Rollback: failed to deactivate price {pid}: {e}")

        # delete product if no prices were created; else archive it
        if created.product_id:
            try:
                if len(created.price_ids) == 0:   # only possible if no prices
                    stripe.Product.delete(created.product_id)
                else:
                    stripe.Product.modify(created.product_id, active=False)
            except Exception as e:
                logger.error(f"Rollback: failed to cleanup product {created.product_id}: {e}")