'use client';

import Link from "next/link";
import { BundleTypeExtended, ItemType } from "@dance-engine/schemas/bundle";
import { EventModelType } from "@dance-engine/schemas/events";
import { formatPounds, getPriceInCents, getPriceName, hasStudentPricing, PriceTier } from "@/lib/eventPricing";
import EventTicketCard from "./EventTicketCard";

export default function EventTicketOptionsSection({
  event,
  orderedBundles,
  items,
  highlightBundleKsuid,
  selectedBundleIds,
  selectedItemIds,
  includedItemIds,
  pricingTier,
  onToggleBundle,
  onToggleItem,
  onTogglePricingTier,
}: {
  event: EventModelType;
  orderedBundles: BundleTypeExtended[];
  items: ItemType[];
  highlightBundleKsuid?: string;
  selectedBundleIds: Set<string>;
  selectedItemIds: Set<string>;
  includedItemIds: Set<string>;
  pricingTier: PriceTier;
  onToggleBundle: (bundle: BundleTypeExtended) => void;
  onToggleItem: (item: ItemType) => void;
  onTogglePricingTier: () => void;
}) {
  const hasBundleCards = orderedBundles.length > 0;
  const bundleFallbackAsCards = !hasBundleCards && items.length > 0;
  const showStudentToggle = [...orderedBundles, ...items].some((entry) => hasStudentPricing(entry));

  return (
    <section id="ticket-options" className="p-6">
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
              onClick={onTogglePricingTier}
              className={`relative h-7 w-12 rounded-full transition ${pricingTier === "student" ? "" : "bg-slate-300"}`}
              style={pricingTier === "student" ? { backgroundColor: "var(--highlight-color)" } : undefined}
            >
              <span
                className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${pricingTier === "student" ? "left-6" : "left-1"}`}
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

        <div className={`grid gap-5 ${highlightBundleKsuid ? "lg:grid-cols-2" : "md:grid-cols-2 xl:grid-cols-3"}`}>
          {bundleFallbackAsCards
            ? items.map((item) => (
                <EventTicketCard
                  key={item.ksuid}
                  title={item.name}
                  description={item.description}
                  price={formatPounds(getPriceInCents(item, pricingTier))}
                  priceName={getPriceName(item, pricingTier)}
                  selected={selectedItemIds.has(item.ksuid)}
                  included={false}
                  actionLabel={selectedItemIds.has(item.ksuid) ? "Selected" : "Select"}
                  onClick={() => onToggleItem(item)}
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
                    <EventTicketCard
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
                      onClick={() => onToggleBundle(bundle)}
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
                <EventTicketCard
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
                      onToggleItem(item);
                    }
                  }}
                />
              );
            })}
          </div>
        </div>
      ) : null}
    </section>
  );
}
