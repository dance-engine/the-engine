'use client';

import Link from "next/link";
import { BundleTypeExtended, ItemType } from "@dance-engine/schemas/bundle";
import { EventModelType } from "@dance-engine/schemas/events";
import { OrganisationType } from "@dance-engine/schemas/organisation";
import { PassSelectorProvider, usePassSelectorActions, usePassSelectorState } from "@/contexts/PassSelectorContext";
import { StripeMultiPurchaseButton } from "@/components/StripePurchaseButton";
import { formatPounds, getPriceInCents, getPriceName, getStripePriceId, hasStudentPricing, PriceTier } from "@/lib/eventPricing";
import { SparklesIcon, TicketIcon } from "./Icons";

type CheckoutLineItem = (ItemType | BundleTypeExtended) & {
  checkout_price?: number;
  checkout_price_id?: string;
  checkout_price_name?: string;
};

const surfaceClasses = "p-6";

const getHighlightBundleKsuid = (event: EventModelType) => {
  const metaBundleKsuid = event.meta?.highlight_bundle_ksuid;
  return typeof metaBundleKsuid === "string" ? metaBundleKsuid : undefined;
};

const getAllItems = (event: EventModelType) =>
  Object.values(event.items || {}).filter((item): item is ItemType => Boolean(item));

const buildCheckoutItem = <T extends ItemType | BundleTypeExtended>(
  item: T,
  pricingTier: PriceTier,
): T & CheckoutLineItem => ({
  ...item,
  checkout_price: getPriceInCents(item, pricingTier),
  checkout_price_id: getStripePriceId(item, pricingTier),
  checkout_price_name: getPriceName(item, pricingTier),
});

const TicketCard = ({
  title,
  description,
  includes,
  price,
  priceName,
  savingsLabel,
  selected,
  included,
  highlighted = false,
  disabled = false,
  actionLabel,
  onClick,
}: {
  title: string;
  description?: string;
  includes?: string[];
  price: string;
  priceName: string;
  savingsLabel?: string;
  selected: boolean;
  included: boolean;
  highlighted?: boolean;
  disabled?: boolean;
  actionLabel: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`group relative flex h-full min-h-[220px] flex-col overflow-hidden rounded-[1.75rem] px-6 py-5 text-left transition ${
      disabled ? "cursor-default opacity-85" : "hover:-translate-y-0.5"
    }`}
    style={{
      backgroundColor: disabled
        ? "color-mix(in srgb, var(--scheme-panel-bg) 70%, grey)"
        : selected
        ? "color-mix(in srgb, var(--scheme-panel-bg) 88%, black)"
        : "color-mix(in srgb, var(--scheme-panel-bg) 100%, black)",
  
      color: disabled
        ? "color-mix(in srgb, var(--scheme-panel-text) 60%, grey)"
        : "var(--scheme-panel-text)",
  
      outline: disabled
        ? "1px solid color-mix(in srgb, grey 50%, transparent)"
        : selected
        ? "2px solid var(--highlight-color)"
        : "1px solid color-mix(in srgb, var(--scheme-panel-text) 8%, transparent)",
  
      outlineOffset: "-1px",
    }}
  >
    {highlighted ? (
      <div
        className="absolute right-4 top-4 inline-flex items-center gap-2 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--highlight-color)]"
      >
        <SparklesIcon className="h-4 w-4" />
        Highlighted pass
      </div>
    ) : null}
    <div className="flex flex-1 flex-col gap-5">
      <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-start">
        <div>
          <p className="text-xl font-black uppercase text-[var(--highlight-color)]">
            {title}
          </p>
          <p
            className="mt-3 text-sm leading-6"
            style={{ color: selected ? "var(--scheme-panel-text)" : "color-mix(in srgb, var(--scheme-panel-text) 88%, transparent)" }}
          >
            {description || " "}
          </p>
        </div>
        <div className="shrink-0 md:min-w-[96px]">
          {priceName !== "Default" && (
            <p className="text-right text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--highlight-color)]">
              {priceName}
            </p>
          )}          
          <p className="text-4xl font-black tracking-tight">{price}</p>
          {savingsLabel ? (
            <p className="mt-1 text-sm font-black text-[var(--highlight-color)]">{savingsLabel}</p>
          ) : null}
        </div>
      </div>

      {includes && includes.length > 0 ? (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--highlight-color)]">
          Includes
          </p>
          <ul className="mt-3 grid gap-2 text-sm" style={{ color: "color-mix(in srgb, var(--scheme-panel-text) 92%, transparent)" }}>
            {includes.map((item) => (
              <li key={item} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "var(--highlight-color)" }} />
                {item}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-auto flex items-end justify-between gap-4 pt-2">
        <div className="min-h-[1.25rem] text-sm font-semibold" style={{ color: included && !selected ? "var(--scheme-panel-muted)" : "transparent" }}>
          {included && !selected ? "Included in a selected bundle" : ""}
        </div>
        <span
          className="inline-flex rounded-full px-4 py-2 text-sm font-semibold"
          style={{
            backgroundColor: selected ? "var(--highlight-color)" : "transparent",
            color: selected ? "var(--scheme-action-text)" : "var(--scheme-panel-text)",
            outline: `1px solid ${selected ? "var(--highlight-color)" : "color-mix(in srgb, var(--scheme-panel-text) 22%, transparent)"}`,
          }}
        >
          {included && !selected ? "Included" : actionLabel}
        </span>
      </div>
    </div>
  </button>
);

function EventTicketingContent({
  event,
  org,
}: {
  event: EventModelType;
  org: OrganisationType;
}) {
  const { selected, included, pricingTier } = usePassSelectorState();
  const { toggleBundle, toggleItem, setPricingTier } = usePassSelectorActions();

  const bundles = event.bundles || [];
  const items = getAllItems(event);
  const highlightBundleKsuid = getHighlightBundleKsuid(event);
  const highlightBundle = bundles.find((bundle) => bundle.ksuid === highlightBundleKsuid);
  const orderedBundles = highlightBundle
    ? [highlightBundle, ...bundles.filter((bundle) => bundle.ksuid !== highlightBundle.ksuid)]
    : bundles;
  const hasBundleCards = orderedBundles.length > 0;
  const showStudentToggle = [...orderedBundles, ...items].some((entry) => hasStudentPricing(entry));

  const selectedBundleIds = new Set(
    orderedBundles.filter((bundle) => selected.includes(bundle.ksuid)).map((bundle) => bundle.ksuid),
  );
  const selectedItemIds = new Set(
    items.filter((item) => selected.includes(item.ksuid)).map((item) => item.ksuid),
  );
  const includedItemIds = new Set(included.flat());
  const lineItems = [
    ...orderedBundles.filter((bundle) => selectedBundleIds.has(bundle.ksuid)).map((bundle) => buildCheckoutItem(bundle, pricingTier)),
    ...items.filter((item) => selectedItemIds.has(item.ksuid)).map((item) => buildCheckoutItem(item, pricingTier)),
  ];

  const requestedItems = Array.from(
    new Map(
      [
        ...items.filter((item) => selectedItemIds.has(item.ksuid)),
        ...included.flatMap((group) => group.map((itemKsuid) => event.items?.[itemKsuid]).filter(Boolean) as ItemType[]),
      ].map((item) => [item.ksuid, item]),
    ).values(),
  );

  const checkoutTotal = lineItems.reduce((sum, item) => sum + (item.checkout_price || 0), 0);
  const directPriceTotal = requestedItems.reduce((sum, item) => sum + getPriceInCents(item, pricingTier), 0);
  const savings = Math.max(0, directPriceTotal - checkoutTotal);
  const highlightedPassLabel = highlightBundle?.name || "Tickets";
  const bundleFallbackAsCards = !hasBundleCards && items.length > 0;

  return (
    <div className="space-y-8">
      <section
        id="ticket-options"
        className={surfaceClasses}
      >
        <div className="flex flex-col gap-4 pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em]" style={{ color: "var(--scheme-surface-muted)" }}>
              Ticket options
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-tight" style={{ color: "var(--scheme-surface-text)" }}>
              Choose the best way to attend
            </h2>
          </div>

          {showStudentToggle ? (
            <label
              className="inline-flex items-center gap-3 px-4 py-3 text-sm font-semibold"
              style={{ color: "var(--scheme-surface-text)" }}
            >
              <span>Student pricing</span>
              <button
                type="button"
                aria-pressed={pricingTier === "student"}
                onClick={() => setPricingTier(pricingTier === "student" ? "standard" : "student")}
                className={`relative h-7 w-12 rounded-full transition ${
                  pricingTier === "student" ? "" : "bg-slate-300"
                }`}
                style={pricingTier === "student" ? { backgroundColor: "var(--highlight-color)" } : undefined}
              >
                <span
                  className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${
                    pricingTier === "student" ? "left-6" : "left-1"
                  }`}
                />
              </button>
            </label>
          ) : null}
        </div>

        <div className="mt-8">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h3 className="text-xl font-black tracking-tight" style={{ color: "var(--scheme-surface-text)" }}>
              {bundleFallbackAsCards ? "Tickets" : "Bundles"}
            </h3>
            <Link href="#checkout" className="text-sm font-semibold text-[var(--highlight-color)]">
              Jump to checkout
            </Link>
          </div>

          <div className={`grid gap-5 ${highlightBundle ? "lg:grid-cols-2" : "md:grid-cols-2 xl:grid-cols-3"}`}>
            {bundleFallbackAsCards
              ? items.map((item) => (
                  <TicketCard
                    key={item.ksuid}
                    title={item.name}
                    description={item.description}
                    price={formatPounds(getPriceInCents(item, pricingTier))}
                    priceName={getPriceName(item, pricingTier)}
                    savingsLabel={undefined}
                    selected={selectedItemIds.has(item.ksuid)}
                    included={false}
                    actionLabel={selectedItemIds.has(item.ksuid) ? "Selected" : "Select"}
                    onClick={() => toggleItem(item)}
                  />
                ))
              : orderedBundles.map((bundle) => {
                  const includedNames = bundle.includes
                    .map((itemKsuid) => event.items?.[itemKsuid]?.name)
                    .filter((name): name is string => Boolean(name));
                  const isSelected = selectedBundleIds.has(bundle.ksuid);
                  const individualValue = bundle.includes.reduce(
                    (sum, itemKsuid) => sum + getPriceInCents(event.items?.[itemKsuid], pricingTier),
                    0,
                  );
                  const bundleSavings = Math.max(0, individualValue - getPriceInCents(bundle, pricingTier));

                  return (
                    <div
                      key={bundle.ksuid}
                      className={`flex flex-col gap-3 ${
                        bundle.ksuid === highlightBundleKsuid ? "md:col-span-2 lg:col-span-2" : ""
                      }`}
                    >
                      <TicketCard
                        title={bundle.name}
                        description={bundle.description}
                        includes={includedNames}
                        price={formatPounds(getPriceInCents(bundle, pricingTier))}
                        priceName={getPriceName(bundle, pricingTier)}
                        savingsLabel={bundleSavings > 0 ? `Save ${formatPounds(bundleSavings)}` : undefined}
                        selected={isSelected}
                        included={false}
                        highlighted={bundle.ksuid === highlightBundleKsuid}
                        actionLabel={isSelected ? "Selected" : "Add bundle"}
                        onClick={() => toggleBundle(bundle, event.items || {})}
                      />
                      {bundleSavings > 0 ? (
                        <p className="px-2 text-sm font-semibold" style={{ color: "var(--scheme-surface-muted)" }}>
                          Saves {formatPounds(bundleSavings)} compared with buying separately
                        </p>
                      ) : null}
                    </div>
                  );
                })}
          </div>
        </div>

        {!bundleFallbackAsCards && items.length > 0 ? (
          <div className="mt-12">
            <h3 className="text-xl font-black tracking-tight" style={{ color: "var(--scheme-surface-text)" }}>Single items</h3>
            <p className="mt-2 text-sm" style={{ color: "var(--scheme-surface-muted)" }}>
              Prefer to build your own? Add individual items below.
            </p>

            <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {items.map((item) => {
                const isSelected = selectedItemIds.has(item.ksuid);
                const isIncluded = includedItemIds.has(item.ksuid);

                return (
                  <TicketCard
                    key={item.ksuid}
                    title={item.name}
                    description={item.description}
                    price={formatPounds(getPriceInCents(item, pricingTier))}
                    priceName={getPriceName(item, pricingTier)}
                    savingsLabel={undefined}
                    selected={isSelected}
                    included={isIncluded}
                    disabled={isIncluded && !isSelected}
                    actionLabel={isSelected ? "Selected" : "Add item"}
                    onClick={() => {
                      if (!isIncluded || isSelected) {
                        toggleItem(item);
                      }
                    }}
                  />
                );
              })}
            </div>
          </div>
        ) : null}
      </section>

      <section id="checkout" className="p-6">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em]" style={{ color: "var(--scheme-surface-muted)" }}>
              Checkout
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-tight" style={{ color: "var(--scheme-surface-text)" }}>
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
                      <p className="text-base font-semibold" style={{ color: "var(--scheme-surface-text)" }}>{item.name}</p>
                      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: "var(--scheme-surface-muted)" }}>
                        {item.entity_type === "BUNDLE" ? "Bundle" : "Item"}
                        {item.checkout_price_name !== "Default" && ` · ${item.checkout_price_name}`}                      </p>
                      {item.entity_type === "BUNDLE" && (item as BundleTypeExtended).includes?.length ? (
                        <p className="mt-2 text-sm" style={{ color: "var(--scheme-surface-muted)" }}>
                          Includes {(item as BundleTypeExtended).includes.length} ticket option
                          {(item as BundleTypeExtended).includes.length > 1 ? "s" : ""}
                        </p>
                      ) : null}
                    </div>
                    <p className="text-lg font-black" style={{ color: "var(--scheme-surface-text)" }}>
                      {formatPounds(item.checkout_price || 0)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div
                className="mt-6 p-6 text-sm"
                style={{ backgroundColor: "var(--scheme-surface-bg-soft)", color: "var(--scheme-surface-muted)" }}
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
              <p className="text-xs font-semibold uppercase tracking-[0.28em]">Ready to buy</p>
            </div>

            <div className="mt-8 space-y-4">
              <div className="p-4">
                <p className="text-sm">Total price</p>
                <p className="mt-1 text-4xl font-black">{formatPounds(checkoutTotal)}</p>
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
              label={lineItems.length > 0 ? `Buy now · ${highlightedPassLabel}` : "Buy now"}
              className="mt-8 inline-flex w-full items-center justify-center rounded-2xl px-5 py-4 text-base font-semibold shadow-[0_16px_30px_rgba(0,0,0,0.22)] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
              style={{
                backgroundColor: "var(--highlight-color)",
                color: "var(--scheme-action-text)",
              }}
            />
          </div>
        </div>
      </section>
    </div>
  );
}

export default function EventTicketing({
  event,
  org,
}: {
  event: EventModelType;
  org: OrganisationType;
}) {
  return (
    <PassSelectorProvider event={event} org={org}>
      <EventTicketingContent event={event} org={org} />
    </PassSelectorProvider>
  );
}
