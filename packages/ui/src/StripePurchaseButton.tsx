'use client';
import { BundleTypeExtended, ItemType } from '@dance-engine/schemas/bundle';
import { OrganisationType } from '@dance-engine/schemas/organisation';
import React from 'react';

function parseErrorMessage(text: string): string {
  try {
    const parsed = JSON.parse(text);
    return parsed.message || parsed.error || text;
  } catch {
    return text || 'An unexpected error occurred.';
  }
}

const StripePurchaseButton = ({accountId, couponCode, label, priceId, cartValue, className, style, }: {accountId?: string, couponCode?: string, label?: string, priceId: string, cartValue?: number, className?: string, style?: React.CSSProperties}) => {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleClick = async () => {
    if (loading) return; // prevent double-clicks
    setLoading(true);
    setError(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      setError('Request timed out. Please try again.');
      setLoading(false);
    }, 15000);

    try {
      const res = await fetch('/api/stripe/checkout_session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          accountId: accountId,
          couponCode: couponCode ? couponCode : false,
          priceId: priceId,
          cartValue: cartValue ? cartValue : undefined,
        }),
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const text = await res.text();
        console.error('checkout session error', res.status, text);
        setError(parseErrorMessage(text));
        setLoading(false);
        return;
      }

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        // Stay disabled — page is navigating away
      } else {
        console.error('No url returned from checkout session', data);
        setError('Failed to initiate checkout. Please try again.');
        setLoading(false);
      }
    } catch (err) {
      clearTimeout(timeoutId);
      if (err instanceof Error && err.name === 'AbortError') return; // handled by timeout callback
      console.error('checkout session error', err);
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  const combinedClass = `${className ?? ''} disabled:opacity-50 disabled:cursor-not-allowed`;

  return (
    <>
      <button
        onClick={handleClick}
        className={combinedClass}
        style={style}
        disabled={loading}
      >
        {loading ? (label ? `${label}…` : 'Processing…') : (label || "Get Yours Now")}
      </button>
      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
    </>
  );
};

const StripeMultiPurchaseButton = ({accountId, org, label, priceId,lineItems, cartValue, className, style, disabled}: 
    {accountId?: string, 
      org?: OrganisationType, 
      label?: string, 
      priceId?: string, 
      lineItems?: (ItemType | BundleTypeExtended)[], 
      cartValue?: number,
      className?: string, 
  style?: React.CSSProperties,
  disabled?: boolean}) => {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleClick = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);

    const body = JSON.stringify({
      accountId: accountId,
      org: org,
      priceId: priceId,
      lineItems: lineItems,
      cartValue: cartValue ? cartValue : undefined,
    });
    console.log("StripeMultiPurchaseButton body:", body);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      setError('Request timed out. Please try again.');
      setLoading(false);
    }, 15000);

    try {
      const res = await fetch('/api/stripe/checkout_session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: body,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const text = await res.text();
        console.error('checkout session error', res.status, text);
        setError(parseErrorMessage(text));
        setLoading(false);
        return;
      }

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        // Stay disabled — page is navigating away
      } else {
        console.error('Failed to add items to cart', data);
        setError(data.error || data.message || 'Failed to create checkout session.');
        setLoading(false);
      }
    } catch (err) {
      clearTimeout(timeoutId);
      if (err instanceof Error && err.name === 'AbortError') return; // handled by timeout callback
      console.error('checkout session error', err);
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  const combinedClass = `${className ?? ''} disabled:opacity-50 disabled:cursor-not-allowed`;

  return (
    <>
      <button
        onClick={handleClick}
        className={combinedClass}
        style={style}
        disabled={loading || disabled}
      >
        {loading ? (label ? `${label}…` : 'Processing…') : (label || "Add to Cart")}
      </button>
      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
    </>
  );
}
export { StripeMultiPurchaseButton };
export default StripePurchaseButton;