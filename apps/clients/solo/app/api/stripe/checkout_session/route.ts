// app/api/create-checkout-session/route.ts (App Router)
// OR pages/api/create-checkout-session.ts (Pages Router)

import { BundleTypeExtended, ItemType } from "@dance-engine/schemas/bundle";
import { NextResponse } from "next/server"; // for App Router
// import Stripe from "stripe";

// const mainStripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
//   apiVersion: "2025-06-30.basil", // check current supported version
// });



export async function POST(req: Request) {
  try {
    const { couponCode, accountId, lineItems, cartValue, org } = await req.json();
    const isAndreas = accountId == 'acct_1RnpiyD1ZofqWwLa' ? true : false
    const checkoutSessionApiUrl = `${process.env.NEXT_PUBLIC_DANCE_ENGINE_API}/public/:organisation/checkout/start`.replace(':organisation', org.organisation || 'unknown');

    console.log("IsAndreas", isAndreas, accountId)
    console.log("Received data:", { couponCode, accountId, lineItems, cartValue });
    const platformCharge = isAndreas || !cartValue ? 0 : Math.round((cartValue * 0.01) + 10 );
    const line_items = lineItems.map((item: (ItemType | BundleTypeExtended)) => ({
          "ksuid": item.ksuid,
          "entity_type": item.entity_type,
          "name": item.name,
          "includes": item.entity_type == "BUNDLE" ? (item as BundleTypeExtended)?.includes || [] :   [],
          "event_ksuid": item.parent_event_ksuid,
          "price_id": item.stripe_price_id,
          "quantity": 1
    }))

    const requestBody = {
  "checkout": [
    {
      "collect_customer_on_stripe": true,
      "coupon_code": couponCode || undefined,
      "success_url": `${process.env.NEXT_PUBLIC_BASE_URL}/checkout/success`,
      "cancel_url": `${process.env.NEXT_PUBLIC_BASE_URL}/`,
      "application_fee_amount": isAndreas ? 0 : platformCharge,
      "stripe_account_id": org.account_id || 'acct_1Ry9rvDqtDds31FK',
      "line_items": line_items
    }
  ]
}

  console.log("Request body for checkout session API:", requestBody);

    const response = await fetch(checkoutSessionApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });
        
    console.log("Response from checkout session API:", response);

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Error response from checkout session API:", errorData);
      return new NextResponse("Failed to create checkout session", { status: 500 });
    }
    // const stripe = accountId == 'acct_1Ry9rvDqtDds31FK' ? new Stripe(process.env.STRIPE_SECRET_KEY_DEV!, { apiVersion: "2025-06-30.basil" }) : mainStripe

    // const baseSessionObject = {
    //   mode: "payment",
    //   payment_method_types: ["card"],
    //   line_items: line_items,
    //   payment_intent_data: {
    //     application_fee_amount: isAndreas ? 0 : platformCharge, 
    //     //   destination: accountId ,
    //     // },
    //   },
    //   success_url: isAndreas ? "https://iamrebel.co.uk/checkout/success" : `${process.env.NEXT_PUBLIC_BASE_URL}/checkout/success`,
    //   cancel_url: isAndreas ? "https://iamrebel.co.uk/" : `${process.env.NEXT_PUBLIC_BASE_URL}/`,
    // } as Stripe.Checkout.SessionCreateParams;

    // const sessionObject = couponCode ? {...baseSessionObject, discounts: [{ coupon: couponCode }]} : {...baseSessionObject, allow_promotion_codes: true };
    // console.log("Checkout Session",sessionObject)



    // const session = await stripe.checkout.sessions.create(sessionObject,
    // {
    //   stripeAccount: accountId, // 🔹 act on behalf of the connected account
    // });

    // return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error(err);
    return new NextResponse("Checkout session error", { status: 500 });
  }
}