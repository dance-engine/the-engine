// app/api/create-checkout-session/route.ts (App Router)
// OR pages/api/create-checkout-session.ts (Pages Router)

import { BundleTypeExtended, ItemType } from "@dance-engine/schemas/bundle";
import { fallbackAccountUrls, getSoloEdgeConfig, getUrlOfAccount } from "@dance-engine/utils/solo-edge-config";
import { NextResponse } from "next/server"; // for App Router
import Stripe from "stripe";

type CheckoutLineItem = {
  ksuid: string;
  entity_type: string;
  name: string;
  includes: BundleTypeExtended["includes"];
  event_ksuid: string;
  price_id: string;
  quantity: number;
};

const mainStripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-06-30.basil", // check current supported version
});

const getCheckoutSessionErrorMessage = (status: number) => {
  if (status === 409) return "Event is at capacity.";
  if (status === 404) return "Missing Dance Engine API";
  if (status >= 400 && status < 500) return "Unable to create checkout session.";
  return "Failed to create checkout session.";
};

const sanitizeCheckoutSessionError = (status: number, errorText: string) => {
  let message = getCheckoutSessionErrorMessage(status);

  if (!errorText) {
    return { message };
  }

  try {
    const parsed = JSON.parse(errorText);
    if (
      parsed
      && typeof parsed === "object"
      && "message" in parsed
      && typeof parsed.message === "string"
    ) {
      message = parsed.message;
    }
  } catch {
    // Keep raw upstream error text in server logs only.
  }

  return { message };
};


export async function POST(req: Request) {
  try {
    const { couponCode, accountId, priceId, lineItems, cartValue, org } = await req.json();
    const soloEdgeConfig = await getSoloEdgeConfig();
    const accountUrls = soloEdgeConfig?.accountUrls || fallbackAccountUrls;
    const isAndreas = accountId == 'acct_1RnpiyD1ZofqWwLa' ? true : false
    // console.log("IsAndreas", isAndreas, accountId)
    // console.log("Received data:", { couponCode, accountId, lineItems, cartValue });
    const platformCharge = isAndreas || !cartValue ? 0 : Math.round((cartValue * 0.015) + 15 );

    if(priceId) {
      console.log("Creating Stripe checkout session with priceId:", priceId);
      const stripe = mainStripe
      const line_items = [{
        price: priceId, // This must be a price from the connected account
        quantity: 1,
      }];
      const baseSessionObject = {
        mode: "payment",
        payment_method_types: ["card"],
        line_items: line_items,
        payment_intent_data: {
          application_fee_amount: isAndreas ? 0 : platformCharge, 
          //   destination: accountId ,
          // },
        },
        success_url: isAndreas ? "https://iamrebel.co.uk/checkout/success" : `${getUrlOfAccount(accountId, accountUrls)}/checkout/success`,
        cancel_url: isAndreas ? "https://iamrebel.co.uk/" : `${getUrlOfAccount(accountId, accountUrls)}/`,
      } as Stripe.Checkout.SessionCreateParams;
      const sessionObject = couponCode ? {...baseSessionObject, discounts: [{ coupon: couponCode }]} : {...baseSessionObject, allow_promotion_codes: true };
        const session = await stripe.checkout.sessions.create(sessionObject,
      {
        stripeAccount: accountId, // 🔹 act on behalf of the connected account
      });

      return NextResponse.json({ url: session.url });
    } 
    else { 
      // console.log("Creating checkout session with line items:", lineItems);
      const checkoutSessionApiUrl = `${process.env.NEXT_PUBLIC_DANCE_ENGINE_API}/public/:organisation/checkout/start`.replace(':organisation', org.organisation || 'unknown');
      const line_items: CheckoutLineItem[] = (lineItems || []).map((item: (ItemType | BundleTypeExtended)) => {
        const rawItem = item as (ItemType | BundleTypeExtended) & {
          event_ksuid?: string;
          stripe_primary_price_id?: string;
        };

        const resolvedEventKsuid = rawItem.parent_event_ksuid || rawItem.event_ksuid || "";
        const resolvedPriceId = rawItem.stripe_price_id || rawItem.stripe_primary_price_id || "";

        return {
          "ksuid": rawItem.ksuid,
          "entity_type": rawItem.entity_type,
          "name": rawItem.name,
          "includes": rawItem.entity_type == "BUNDLE" ? (rawItem as BundleTypeExtended)?.includes || [] : [],
          "event_ksuid": resolvedEventKsuid,
          "price_id": resolvedPriceId,
          "quantity": 1
        };
      });

      if (!line_items.length) {
        return NextResponse.json({ message: "No line items selected for checkout." }, { status: 400 });
      }

      const missingEventKsuid = line_items.find((item) => !item.event_ksuid);
      if (missingEventKsuid) {
        return NextResponse.json(
          { message: `Unable to reserve: missing event reference for item ${missingEventKsuid.ksuid}.` },
          { status: 400 }
        );
      }

      const missingPriceId = line_items.find((item) => !item.price_id);
      if (missingPriceId) {
        return NextResponse.json(
          { message: `Unable to checkout ${missingPriceId.name}: this product has not been published to Stripe yet.` },
          { status: 400 }
        );
      }

      const eventKsuid = line_items[0]?.event_ksuid;

      if (!eventKsuid) {
        return NextResponse.json({ message: "Unable to reserve: event reference is missing." }, { status: 400 });
      }

      const requestBody = {
        "checkout": [
          {
            "collect_customer_on_stripe": true,
            "coupon_code": couponCode || undefined,
            "success_url": `${getUrlOfAccount(org.account_id || '', accountUrls)}/${eventKsuid}/success`,
            "cancel_url": `${getUrlOfAccount(org.account_id || '', accountUrls)}/${eventKsuid}`,
            "application_fee_amount": isAndreas ? 0 : platformCharge,
            "stripe_account_id": org.account_id || 'acct_1Ry9rvDqtDds31FK',
            "line_items": line_items
          }
        ]
      }

      // console.log("Request body for checkout session API:", requestBody);

      const response = await fetch(checkoutSessionApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
          
      // console.log("Response from checkout session API:", response);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error response from checkout session API:", errorText);

        return NextResponse.json(
          sanitizeCheckoutSessionError(response.status, errorText),
          { status: response.status }
        );
      }

      const data = await response.json();
      console.log("Data from checkout session API:", data);

      if (data.checkout && data.checkout.stripe_checkout_url) {
        return NextResponse.json({ url: data.checkout.stripe_checkout_url });
      } else {
        console.error("No URL in checkout session API response:", data);
        return NextResponse.json({ error: "Failed to create checkout session", ...data }, { status: 500 });
      }
    }

    // return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error(err);
    return new NextResponse("Checkout session error", { status: 500 });
  }
}