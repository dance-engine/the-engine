"use client";

import { BundleTypeExtended, ItemType } from "@dance-engine/schemas/bundle";
import { OrganisationType } from "@dance-engine/schemas/organisation";
import { StripeMultiPurchaseButton } from "../StripePurchaseButton";
import { formatPounds } from "./lib/eventPricing";
import { TicketIcon } from "./Icons";

type CheckoutLineItem = (ItemType | BundleTypeExtended) & {
  checkout_price?: number;
  checkout_price_id?: string;
  checkout_price_name?: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
};

export default function EventCheckoutSection({
  org,
  lineItems,
  checkoutTotal,
  savings,
  highlightedPassLabel,
  onLineItemContactChange,
}: {
  org: OrganisationType;
  lineItems: CheckoutLineItem[];
  checkoutTotal: number;
  savings: number;
  highlightedPassLabel: string;
  onLineItemContactChange: (
    itemKsuid: string,
    field: "customer_name" | "customer_email",
    value: string,
  ) => void;
}) {
  return (
    <section id="checkout" className="p-6">
      <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <p
            className="text-xs font-semibold uppercase tracking-[0.28em]"
            style={{ color: "var(--scheme-surface-muted)" }}
          >
            Checkout
          </p>
          <h2
            className="mt-2 text-3xl font-black tracking-tight"
            style={{ color: "var(--scheme-surface-text)" }}
          >
            Your order summary
          </h2>

          {lineItems.length > 0 ? (
            <div className="mt-6 space-y-3">
              {lineItems.map((item) => (
                <div
                  key={item.ksuid}
                  className="flex items-start justify-between gap-4 px-4 py-4"
                  style={{ backgroundColor: "var(--scheme-surface-bg-soft)" }}
                >
                  <div>
                    <p
                      className="text-lg font-semibold"
                      style={{ color: "var(--scheme-surface-text)" }}
                    >
                      {item.name}
                    </p>
                    <p
                      className="mt-1 text-xs font-semibold uppercase tracking-[0.24em]"
                      style={{ color: "var(--scheme-surface-muted)" }}
                    >
                      {item.entity_type === "BUNDLE" ? "Bundle" : "Individual Item"}
                      {item.checkout_price_name !== "Default" &&
                        ` · ${item.checkout_price_name}`}
                    </p>
                    {item.entity_type === "BUNDLE" &&
                    (item as BundleTypeExtended).includes?.length ? (
                      <p
                        className="mt-2 text-sm"
                        style={{ color: "var(--scheme-surface-muted)" }}
                      >
                        Includes {(item as BundleTypeExtended).includes.length}{" "}
                        ticket option
                        {(item as BundleTypeExtended).includes.length > 1
                          ? "s"
                          : ""}
                      </p>
                    ) : null}
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      <input
                        type="text"
                        value={item.customer_name || ""}
                        onChange={(event) =>
                          onLineItemContactChange(
                            item.ksuid,
                            "customer_name",
                            event.target.value,
                          )
                        }
                        placeholder="Name on ticket"
                        className="w-full border px-3 py-2 text-sm"
                        style={{
                          borderColor: "var(--scheme-surface-border, #d4d4d8)",
                          backgroundColor: "white",
                          color: "var(--scheme-surface-text)",
                        }}
                      />
                      <input
                        type="email"
                        value={item.customer_email || ""}
                        onChange={(event) =>
                          onLineItemContactChange(
                            item.ksuid,
                            "customer_email",
                            event.target.value,
                          )
                        }
                        placeholder="Email for ticket"
                        className="w-full border px-3 py-2 text-sm"
                        style={{
                          borderColor: "var(--scheme-surface-border, #d4d4d8)",
                          backgroundColor: "white",
                          color: "var(--scheme-surface-text)",
                        }}
                      />
                    </div>
                  </div>
                  <p
                    className="text-xl font-black"
                    style={{ color: "var(--scheme-surface-text)" }}
                  >
                    {formatPounds(item.checkout_price || 0)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div
              className="mt-6 p-6 text-sm"
              style={{
                backgroundColor: "var(--scheme-surface-bg-soft)",
                color: "var(--scheme-surface-muted)",
              }}
            >
              Select a pass or item above to start your order.
            </div>
          )}
        </div>

        <div
          className="p-6"
          style={{ backgroundColor: "white", color: "black" }}
        >
          <div className="flex items-center gap-3" style={{ color: "black" }}>
            <TicketIcon className="h-5 w-5" />
            <p className="text-xs font-semibold uppercase tracking-[0.28em]">
              Ready to buy
            </p>
          </div>

          <div className="mt-8 space-y-4">
            <div className="p-4">
              <p className="text-sm">Total price</p>
              <p className="mt-1 text-4xl font-black">
                {formatPounds(checkoutTotal)}
              </p>
              {savings > 0 ? (
                <p className="mt-2 text-sm font-semibold text-emerald-600">
                  You save {formatPounds(savings)} with this combination
                </p>
              ) : null}
            </div>
          </div>

          <StripeMultiPurchaseButton
            accountId={org.account_id || "acct_1Ry9rvDqtDds31FK"}
            org={org}
            lineItems={lineItems}
            cartValue={checkoutTotal}
            disabled={lineItems.length === 0}
            label={
              lineItems.length > 0
                ? `Buy now · ${highlightedPassLabel}`
                : "Buy now"
            }
            className="mt-8 inline-flex w-full cursor-pointer items-center justify-center rounded-lg px-5 py-4 text-base font-semibold shadow-[0_16px_30px_rgba(0,0,0,0.22)] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              backgroundColor: "var(--highlight-color)",
              color: "var(--scheme-action-text)",
            }}
          />
          <div>
            <p className="mt-4 text-xs" style={{ color: "var(--scheme-surface-muted)" }}>
              By completing your purchase, you agree to our{" "}
              <a
                href="https://www.danceengine.com/tos"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                terms of service
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
