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

export default StripePurchaseButton;