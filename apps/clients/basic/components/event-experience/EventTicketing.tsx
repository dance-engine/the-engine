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

const surfaceClasses = "border p-6";

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
    className={`group relative flex h-full flex-col overflow-hidden border text-left transition ${
      selected
        ? ""
        : ""
    } ${disabled ? "cursor-default opacity-85" : ""}`}
    style={{
      borderColor: selected ? "var(--highlight-color)" : "var(--scheme-surface-border)",
      backgroundColor: selected ? "var(--scheme-panel-bg)" : "var(--scheme-surface-bg-strong)",
      color: selected ? "var(--scheme-panel-text)" : "var(--scheme-surface-text)",
    }}
  >
    {highlighted ? (
      <div
        className="absolute right-4 top-4 inline-flex items-center gap-2 border px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--highlight-color)]"
        style={{ backgroundColor: "var(--scheme-surface-bg-strong)", borderColor: "var(--highlight-color)" }}
      >
        <SparklesIcon className="h-4 w-4" />
        Highlighted pass
      </div>
    ) : null}
    <div className="flex flex-1 flex-col gap-4 p-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--highlight-color)]">
          {priceName}
        </p>
        <h3 className="mt-2 text-2xl font-black tracking-tight">{title}</h3>
        {description ? (
          <p
            className="mt-3 text-sm leading-6"
            style={{ color: selected ? "var(--scheme-panel-muted)" : "var(--scheme-surface-muted)" }}
          >
            {description}
          </p>
        ) : null}
      </div>

      {includes && includes.length > 0 ? (
        <div
          className="border p-4"
          style={{
            borderColor: selected ? "rgba(255,255,255,0.08)" : "var(--scheme-surface-border)",
            backgroundColor: selected ? "var(--scheme-panel-bg-soft)" : "var(--scheme-surface-bg-soft)",
          }}
        >
          <p
            className="text-xs font-semibold uppercase tracking-[0.22em]"
            style={{ color: selected ? "var(--scheme-panel-muted)" : "var(--scheme-surface-muted)" }}
          >
            Includes
          </p>
          <ul className="mt-3 grid gap-2 text-sm" style={{ color: selected ? "var(--scheme-panel-text)" : "var(--scheme-surface-text)" }}>
            {includes.map((item) => (
              <li key={item} className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: "var(--highlight-color)" }} />
                {item}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-auto flex items-end justify-between gap-4">
        <div>
          <p className="text-3xl font-black tracking-tight">{price}</p>
          {included && !selected ? (
            <p className="mt-1 text-sm font-semibold" style={{ color: "var(--scheme-surface-muted)" }}>Included in a selected bundle</p>
          ) : null}
        </div>
        <span
          className="inline-flex border px-4 py-2 text-sm font-semibold"
          style={{
            backgroundColor: selected ? "var(--scheme-hero-chip)" : "var(--highlight-color)",
            borderColor: selected ? "var(--scheme-hero-chip)" : "var(--highlight-color)",
            color: selected ? "var(--surface-text-color)" : "var(--org-color-text-primary)",
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
        style={{ borderColor: "var(--scheme-surface-border)", backgroundColor: "var(--scheme-surface-bg)" }}
      >
        <div className="flex flex-col gap-4 border-b pb-6 md:flex-row md:items-end md:justify-between" style={{ borderColor: "var(--scheme-surface-border)" }}>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em]" style={{ color: "var(--scheme-surface-muted)" }}>
              Ticket options
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-tight" style={{ color: "var(--scheme-surface-text)" }}>
              Choose the best way to attend
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6" style={{ color: "var(--scheme-surface-muted)" }}>
              Bundles are presented first so the best-value combinations are clear. Your basket keeps
              the existing cheapest-combination logic and updates the checkout selection automatically.
            </p>
          </div>

          {showStudentToggle ? (
            <label
              className="inline-flex items-center gap-3 border px-4 py-3 text-sm font-semibold"
              style={{ borderColor: "var(--scheme-surface-border)", backgroundColor: "var(--scheme-surface-bg-soft)", color: "var(--scheme-surface-text)" }}
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
              Prefer to build your own order? Add individual items below.
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

      <section id="checkout" className="border p-6" style={{ borderColor: "var(--scheme-surface-border)", backgroundColor: "var(--scheme-surface-bg-strong)" }}>
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
                    className="flex items-start justify-between gap-4 border px-4 py-4"
                    style={{ borderColor: "var(--scheme-surface-border)", backgroundColor: "var(--scheme-surface-bg-soft)" }}
                  >
                    <div>
                      <p className="text-base font-semibold" style={{ color: "var(--scheme-surface-text)" }}>{item.name}</p>
                      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: "var(--scheme-surface-muted)" }}>
                        {item.entity_type === "BUNDLE" ? "Bundle" : "Item"} · {item.checkout_price_name}
                      </p>
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
                className="mt-6 border border-dashed p-6 text-sm"
                style={{ borderColor: "var(--scheme-surface-border)", backgroundColor: "var(--scheme-surface-bg-soft)", color: "var(--scheme-surface-muted)" }}
              >
                Select a pass or item above to start your order.
              </div>
            )}
          </div>

          <div
            className="border p-6"
            style={{ backgroundColor: "var(--scheme-panel-bg)", color: "var(--scheme-panel-text)" }}
          >
            <div className="flex items-center gap-3" style={{ color: "var(--scheme-panel-muted)" }}>
              <TicketIcon className="h-5 w-5" />
              <p className="text-xs font-semibold uppercase tracking-[0.28em]">Ready to buy</p>
            </div>

            <div className="mt-8 space-y-4">
              <div className="border p-4" style={{ backgroundColor: "var(--scheme-panel-bg-soft)", borderColor: "color-mix(in srgb, var(--scheme-panel-text) 10%, transparent)" }}>
                <p className="text-sm" style={{ color: "var(--scheme-panel-muted)" }}>Selected options</p>
                <p className="mt-1 text-3xl font-black">{lineItems.length}</p>
              </div>
              <div className="border p-4" style={{ backgroundColor: "var(--scheme-panel-bg-soft)", borderColor: "color-mix(in srgb, var(--scheme-panel-text) 10%, transparent)" }}>
                <p className="text-sm" style={{ color: "var(--scheme-panel-muted)" }}>Total price</p>
                <p className="mt-1 text-4xl font-black">{formatPounds(checkoutTotal)}</p>
                {savings > 0 ? (
                  <p className="mt-2 text-sm font-semibold text-emerald-300">
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
              className="mt-8 inline-flex w-full items-center justify-center rounded-2xl px-5 py-4 text-base font-semibold text-white shadow-[0_16px_30px_rgba(0,0,0,0.22)] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
              style={{ backgroundColor: "var(--highlight-color)" }}
            />
            <p className="mt-3 text-xs leading-5" style={{ color: "var(--scheme-panel-muted)" }}>
              Secure checkout is handled by Dance Engine using the organisation&apos;s existing API flow.
            </p>
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
