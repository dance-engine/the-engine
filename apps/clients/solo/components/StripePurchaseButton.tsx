'use client';
import React from 'react';

const StripePurchaseButton = ({accountId, couponCode, label, priceId, className, style, }: {accountId?: string, couponCode?: string, label?: string, priceId: string, className?: string, style?: React.CSSProperties}) => {
  const handleClick = async () => {
    const res = await fetch('/api/stripe/checkout_session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accountId: accountId, // if needed, otherwise remove
        couponCode: couponCode ? couponCode : false, // must be the actual coupon ID from Stripe
        priceId: priceId, // must be the actual product ID from Stripe
      }),
    });

    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
    } else {
      alert("Failed to create checkout session");
    }
  };

  return (
    <button
      onClick={handleClick}
      className={className}
      style={style}
    >
      { label ? label : "Get Yours Now" }
    </button>
  );
};

const StripeMultiPurchaseButton = ({accountId, label, priceIds,className, style}: {accountId?: string, label?: string, priceIds: string[], className?: string, style?: React.CSSProperties}) => {
  const handleClick = async () => {

    const body = JSON.stringify({
        accountId: accountId, // if needed, otherwise remove
        priceIds: priceIds, // must be the actual product IDs from Stripe
      })
      console.log("StripeMultiPurchaseButton body:", body);
    const res = await fetch('/api/stripe/checkout_session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body,
    });

    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
    } else {
      console.error("Failed to add items to cart", data);
      alert("Failed to add items to cart",);
    }
  };

  return (
    <button
      onClick={handleClick}
      className={className}
      style={style}
    >
      { label ? label : "Add to Cart" }
    </button>
  );
}
export { StripeMultiPurchaseButton };
export default StripePurchaseButton;