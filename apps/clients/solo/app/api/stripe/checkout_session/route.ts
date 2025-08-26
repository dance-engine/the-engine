// app/api/create-checkout-session/route.ts (App Router)
// OR pages/api/create-checkout-session.ts (Pages Router)

import { NextResponse } from "next/server"; // for App Router
import Stripe from "stripe";

const mainStripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-06-30.basil", // check current supported version
});



export async function POST(req: Request) {
  try {
    const { couponCode, accountId, priceId, priceIds } = await req.json();
    const isAndreas = accountId == 'acct_1RnpiyD1ZofqWwLa' ? true : false

    const line_items = priceIds ? priceIds.map((id: string) => ({
      price: id,
      quantity: 1,
    })) : [{
          price: priceId, // This must be a price from the connected account
          quantity: 1,
        }];
        
    const stripe = accountId == 'acct_1Ry9rvDqtDds31FK' ? new Stripe(process.env.STRIPE_SECRET_KEY_DEV!, { apiVersion: "2025-06-30.basil" }) : mainStripe

    // allow_promotion_codes: true,

    const baseSessionObject = {
      mode: "payment",
      payment_method_types: ["card"],
      line_items: line_items,
      payment_intent_data: {
        application_fee_amount: isAndreas ? 0 : 50, //! This should be based on whats being charged!
        // transfer_data: {
        //   destination: accountId ,
        // },
      },
      success_url: isAndreas ? "https://iamrebel.co.uk/checkout/success" : `${process.env.NEXT_PUBLIC_BASE_URL}/checkout/success`,
      cancel_url: isAndreas ? "https://iamrebel.co.uk/" : `${process.env.NEXT_PUBLIC_BASE_URL}/`,
    } as Stripe.Checkout.SessionCreateParams;

    const sessionObject = couponCode ? {...baseSessionObject, discounts: [{ coupon: couponCode }]} : {...baseSessionObject, allow_promotion_codes: true };

    const session = await stripe.checkout.sessions.create(sessionObject,
    {
      stripeAccount: accountId, // 🔹 act on behalf of the connected account
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error(err);
    return new NextResponse("Checkout session error", { status: 500 });
  }
}