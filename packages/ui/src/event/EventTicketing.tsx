"use client";

import { BundleTypeExtended, ItemType } from "@dance-engine/schemas/bundle";
import { EventModelType } from "@dance-engine/schemas/events";
import { OrganisationType } from "@dance-engine/schemas/organisation";
import {
  PassSelectorProvider,
  usePassSelectorActions,
  usePassSelectorState,
} from "./contexts/PassSelectorContext";
import {
  getPriceInCents,
  getPriceName,
  getStripePriceId,
  PriceTier,
} from "./lib/eventPricing";
import EventCheckoutSection from "./EventCheckoutSection";
import EventTicketOptionsSection from "./EventTicketOptionsSection";

type CheckoutLineItem = (ItemType | BundleTypeExtended) & {
  checkout_price?: number;
  checkout_price_id?: string;
  checkout_price_name?: string;
};

const getHighlightBundleKsuid = (event: EventModelType) => {
  const metaBundleKsuid = event.meta?.highlight_bundle_ksuid;
  return typeof metaBundleKsuid === "string" ? metaBundleKsuid : undefined;
};

const getAllItems = (event: EventModelType) =>
  Object.values(event.items || {}).filter((item): item is ItemType =>
    Boolean(item),
  );

const buildCheckoutItem = <T extends ItemType | BundleTypeExtended>(
  item: T,
  pricingTier: PriceTier,
): T & CheckoutLineItem => ({
  ...item,
  checkout_price: getPriceInCents(item, pricingTier),
  checkout_price_id: getStripePriceId(item, pricingTier),
  checkout_price_name: getPriceName(item, pricingTier),
});

function EventTicketingContent({
  event,
  org,
}: {
  event: EventModelType;
  org: OrganisationType;
}) {
  const { selected, included, pricingTier } = usePassSelectorState();
  const { toggleBundle, toggleItem, setPricingTier } = usePassSelectorActions();

  const items = getAllItems(event);
  const highlightBundleKsuid = getHighlightBundleKsuid(event);
  const highlightBundle = (event.bundles || []).find(
    (bundle) => bundle.ksuid === highlightBundleKsuid,
  );
  const orderedBundles = highlightBundle
    ? [
        highlightBundle,
        ...(event.bundles || []).filter(
          (bundle) => bundle.ksuid !== highlightBundle.ksuid,
        ),
      ]
    : event.bundles || [];

  const selectedBundleIds = new Set(
    orderedBundles
      .filter((bundle) => selected.includes(bundle.ksuid))
      .map((bundle) => bundle.ksuid),
  );
  const selectedItemIds = new Set(
    items
      .filter((item) => selected.includes(item.ksuid))
      .map((item) => item.ksuid),
  );
  const includedItemIds = new Set(included.flat());

  const lineItems = [
    ...orderedBundles
      .filter((bundle) => selectedBundleIds.has(bundle.ksuid))
      .map((bundle) => buildCheckoutItem(bundle, pricingTier)),
    ...items
      .filter((item) => selectedItemIds.has(item.ksuid))
      .map((item) => buildCheckoutItem(item, pricingTier)),
  ];

  const requestedItems = Array.from(
    new Map(
      [
        ...items.filter((item) => selectedItemIds.has(item.ksuid)),
        ...included.flatMap(
          (group) =>
            group
              .map((itemKsuid) => event.items?.[itemKsuid])
              .filter(Boolean) as ItemType[],
        ),
      ].map((item) => [item.ksuid, item]),
    ).values(),
  );

  const checkoutTotal = lineItems.reduce(
    (sum, item) => sum + (item.checkout_price || 0),
    0,
  );
  const directPriceTotal = requestedItems.reduce(
    (sum, item) => sum + getPriceInCents(item, pricingTier),
    0,
  );
  const savings = Math.max(0, directPriceTotal - checkoutTotal);
  const highlightedPassLabel = highlightBundle?.name || "Tickets";

  return items && items.length > 0 ? (
    <div className="space-y-8">
      <EventTicketOptionsSection
        event={event}
        orderedBundles={orderedBundles}
        items={items}
        highlightBundleKsuid={highlightBundleKsuid}
        selectedBundleIds={selectedBundleIds}
        selectedItemIds={selectedItemIds}
        includedItemIds={includedItemIds}
        pricingTier={pricingTier}
        onToggleBundle={(bundle: BundleTypeExtended) =>
          toggleBundle(bundle, event.items || {})
        }
        onToggleItem={toggleItem}
        onTogglePricingTier={() =>
          setPricingTier(pricingTier === "student" ? "standard" : "student")
        }
      />

      <EventCheckoutSection
        org={org}
        lineItems={lineItems}
        checkoutTotal={checkoutTotal}
        savings={savings}
        highlightedPassLabel={highlightedPassLabel}
      />
    </div>
  ) : <div className="px-6 py-12 text-center text-gray-600">No ticket options available for this event currently.</div>;
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
