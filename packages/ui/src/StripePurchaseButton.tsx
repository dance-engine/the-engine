'use client';
import { BundleTypeExtended, ItemType } from '@dance-engine/schemas/bundle';
import { OrganisationType } from '@dance-engine/schemas/organisation';
import React from 'react';

const ERROR_DISPLAY_MS = 2500;
const ERROR_FADE_MS = 500;

type ErrorMessageState = {
  id: number;
  message: string;
};

const getCheckoutErrorMessage = async (response: Response) => {
  const fallbackMessage = 'There was a problem initiating the checkout. Please try again.';

  try {
    const text = await response.text();
    if (!text) return fallbackMessage;

    const parsed = JSON.parse(text);
    if (
      parsed
      && typeof parsed === 'object'
      && 'message' in parsed
      && typeof parsed.message === 'string'
    ) {
      return parsed.message;
    }
  } catch {
    // Fall back to a generic client-safe message when the body is not JSON.
  }

  return fallbackMessage;
};

const getCheckoutRequestErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.name === 'AbortError') {
    return 'Checkout request timed out. Please try again.';
  }

  return 'There was a problem initiating the checkout. Please try again.';
};


const ErrorStateDialog = ({
  message,
  resetKey,
  onDismiss,
}: {
  message: string;
  resetKey: number;
  onDismiss: () => void;
}) => {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    setVisible(false);

    const animationFrame = requestAnimationFrame(() => setVisible(true));
    const hideTimeout = window.setTimeout(() => setVisible(false), ERROR_DISPLAY_MS);
    const dismissTimeout = window.setTimeout(onDismiss, ERROR_DISPLAY_MS + ERROR_FADE_MS);

    return () => {
      cancelAnimationFrame(animationFrame);
      window.clearTimeout(hideTimeout);
      window.clearTimeout(dismissTimeout);
    };
  }, [onDismiss, resetKey]);

  return (
    <div
      className={`pointer-events-none fixed top-0 left-0 w-screen h-screen z-10 min-h-64 flex items-center justify-center bg-de-background-dark/80  p-4 text-white
        transition-opacity duration-500 ease-out
        ${visible ? 'opacity-100' : 'opacity-0'}`}
    >
      <p
        className="text-xl w-10/12 flex items-center justify-center max-w-2xl min-h-64 rounded px-6 py-4 text-center bg-de-background-dark font-bold"
        style={{
          // backgroundColor: 'var(--accent-color, var(--org-color-secondary, #2d5b87))',
          color: 'var(--primary-color, var(--scheme-action-text, #ffffff))',
        }}
      >
        {message}
      </p>
    </div>
  );
};

const StripePurchaseButton = ({accountId, couponCode, label, priceId, cartValue, className, style, }: {accountId?: string, couponCode?: string, label?: string, priceId: string, cartValue?: number, className?: string, style?: React.CSSProperties}) => {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<ErrorMessageState | null>(null);
  const errorIdRef = React.useRef(0);

  const showError = (message: string) => {
    errorIdRef.current += 1;
    setError({ id: errorIdRef.current, message });
  };

  const handleClick = async () => {
    if (loading) return; // prevent double-clicks
    setError(null);
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
        showError(await getCheckoutErrorMessage(res));
        return;
      }

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('no url returned from checkout session');
      }
    } catch (err) {
      console.error('checkout session error', err);
      showError(getCheckoutRequestErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const combinedClass = `${className ?? ''} disabled:opacity-50 disabled:cursor-not-allowed`;

  return (
    <div>
      <button
        onClick={handleClick}
        className={combinedClass}
        style={style}
        disabled={loading}
      >
        {loading ? (label ? `${label}…` : 'Processing…') : (label || "Get Yours Now")}
      </button>
      {error && <ErrorStateDialog message={error.message} resetKey={error.id} onDismiss={() => setError(null)} />}
    </div>
  );
};

const StripeMultiPurchaseButton = ({accountId, org, label, priceId,lineItems, cartValue, className, style, disabled, pricing_tier}: 
    {accountId?: string, 
      org?: OrganisationType, 
      label?: string, 
      priceId?: string, 
      pricing_tier?: string,
      lineItems?: (ItemType | BundleTypeExtended)[], 
      cartValue?: number,
      className?: string, 
  style?: React.CSSProperties,
  disabled?: boolean}) => {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<ErrorMessageState | null>(null);
  const errorIdRef = React.useRef(0);

  const showError = (message: string) => {
    errorIdRef.current += 1;
    setError({ id: errorIdRef.current, message });
  };

  const handleClick = async () => {
    if (loading) return;
    setError(null);
    setLoading(true);

    try {
      const body = JSON.stringify({
        accountId: accountId, // if needed, otherwise remove
        org: org,
        priceId: priceId, // must be the actual product IDs from Stripe
        lineItems: lineItems, // must be the actual product IDs from Stripe
        cartValue: cartValue ? cartValue : undefined,
        pricing_tier: pricing_tier,
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
        showError(await getCheckoutErrorMessage(res));
        return;
      }

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        // Don't reset loading — keep the button disabled while the browser navigates.
        return;
      } else {
        console.error("Failed to add items to cart", data);
        showError('Failed to add items to cart.');
      }
    } catch (err) {
      console.error('checkout session error', err);
      showError(getCheckoutRequestErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const combinedClass = `${className ?? ''} disabled:opacity-50 disabled:cursor-not-allowed`;

  return (
    <div>
      <button
        onClick={handleClick}
        className={combinedClass}
        style={style}
        disabled={loading || disabled}
      >
        {loading ? (label ? `${label}…` : 'Processing…') : (label || "Add to Cart")}
      </button>
      {error && <ErrorStateDialog message={error.message} resetKey={error.id} onDismiss={() => setError(null)} />}
    </div>
  );
}
export { StripeMultiPurchaseButton };
export default StripePurchaseButton;