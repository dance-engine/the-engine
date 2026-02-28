'use client';
import { BundleTypeExtended, ItemType } from '@dance-engine/schemas/bundle';
import { OrganisationType } from '@dance-engine/schemas/organisation';
import React from 'react';

const StripePurchaseButton = ({accountId, couponCode, label, priceId, cartValue, className, style, }: {accountId?: string, couponCode?: string, label?: string, priceId: string, cartValue?: number, className?: string, style?: React.CSSProperties}) => {
  const [loading, setLoading] = React.useState(false);

  const handleClick = async () => {
    if (loading) return; // prevent double-clicks
    setLoading(true);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const res = await fetch('/api/stripe/checkout_session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          accountId: accountId, // if needed, otherwise remove
          couponCode: couponCode ? couponCode : false, // must be the actual coupon ID from Stripe
          priceId: priceId, // must be the actual product ID from Stripe
          cartValue: cartValue ? cartValue : undefined,
        }),
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        // handle non-200 responses
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text}`);
      }

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('no url returned from checkout session');
      }
    } catch (err) {
      console.error('checkout session error', err);
      alert('There was a problem initiating the checkout. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const combinedClass = `${className ?? ''} disabled:opacity-50 disabled:cursor-not-allowed`;

  return (
    <button
      onClick={handleClick}
      className={combinedClass}
      style={style}
      disabled={loading}
    >
      {loading ? (label ? `${label}…` : 'Processing…') : (label || "Get Yours Now")}
    </button>
  );
};

const StripeMultiPurchaseButton = ({accountId, org, label, priceId,lineItems, cartValue, className, style}: 
    {accountId?: string, 
      org?: OrganisationType, 
      label?: string, 
      priceId?: string, 
      lineItems?: (ItemType | BundleTypeExtended)[], 
      cartValue?: number,
      className?: string, 
      style?: React.CSSProperties}) => {
  const [loading, setLoading] = React.useState(false);

  const handleClick = async () => {
    if (loading) return;
    setLoading(true);

    try {
      const body = JSON.stringify({
        accountId: accountId, // if needed, otherwise remove
        org: org,
        priceId: priceId, // must be the actual product IDs from Stripe
        lineItems: lineItems, // must be the actual product IDs from Stripe
        cartValue: cartValue ? cartValue : undefined,
      });
      console.log("StripeMultiPurchaseButton body:", body);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const res = await fetch('/api/stripe/checkout_session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: body,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text}`);
      }

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error("Failed to add items to cart", data);
        alert("Failed to add items to cart");
      }
    } catch (err) {
      console.error('checkout session error', err);
      alert('There was a problem initiating the checkout. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const combinedClass = `${className ?? ''} disabled:opacity-50 disabled:cursor-not-allowed`;

  return (
    <button
      onClick={handleClick}
      className={combinedClass}
      style={style}
      disabled={loading}
    >
      {loading ? (label ? `${label}…` : 'Processing…') : (label || "Add to Cart")}
    </button>
  );
}
export { StripeMultiPurchaseButton };
export default StripePurchaseButton;