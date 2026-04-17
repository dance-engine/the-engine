'use client'

import Badge from "@dance-engine/ui/Badge";
import { BundleTypeExtended, ItemType } from "@dance-engine/schemas/bundle";
import BuilderCard from "./BuilderCard";

interface InventorySelectorCardProps {
  eventName?: string;
  bundles: BundleTypeExtended[];
  items: ItemType[];
  selectedBundleIds: Set<string>;
  selectedItemIds: Set<string>;
  includedItemIds: Set<string>;
  onToggleBundle: (bundle: BundleTypeExtended) => void;
  onToggleItem: (item: ItemType) => void;
}

const formatCurrency = (value?: number) => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return null;
  }

  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(value / 100);
};

const InventoryButton = ({
  title,
  subtitle,
  price,
  status,
  selected,
  included = false,
  disabled = false,
  onToggle,
}: {
  title: string;
  subtitle?: string;
  price?: number;
  status?: string;
  selected: boolean;
  included?: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) => (
  <button
    type="button"
    onClick={onToggle}
    disabled={disabled}
    className={`w-full rounded-lg border px-4 py-3 text-left transition ${
      selected
        ? "border-keppel-on-light bg-keppel-on-light/5"
        : included
          ? "border-gray-200 bg-gray-50"
          : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
    } ${disabled ? "cursor-not-allowed opacity-70" : ""}`}
  >
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-gray-900">{title}</p>
        {subtitle ? <p className="mt-1 text-sm text-gray-600">{subtitle}</p> : null}
      </div>
      <div className="flex items-center gap-2">
        {status ? <Badge>{status}</Badge> : null}
        {price !== undefined ? <span className="text-sm font-medium text-gray-700">{formatCurrency(price)}</span> : null}
      </div>
    </div>
  </button>
);

const InventorySelectorCard = ({
  eventName,
  bundles,
  items,
  selectedBundleIds,
  selectedItemIds,
  includedItemIds,
  onToggleBundle,
  onToggleItem,
}: InventorySelectorCardProps) => {
  const hasInventory = bundles.length > 0 || items.length > 0;

  return (
    <BuilderCard
      title="Includes"
      description={
        eventName
          ? `Choose the bundles and items that should be included on the ticket for ${eventName}.`
          : "Choose an event first to load the available bundles and items."
      }
    >
      {!eventName ? (
        <p className="rounded-lg border border-dashed border-gray-200 px-4 py-6 text-sm text-gray-500">
          Select an event to browse inventory.
        </p>
      ) : !hasInventory ? (
        <p className="rounded-lg border border-dashed border-gray-200 px-4 py-6 text-sm text-gray-500">
          No bundles or items are currently attached to this event.
        </p>
      ) : (
        <div className="space-y-6">
          {bundles.length > 0 ? (
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Bundles</h3>
              <div className="mt-3 space-y-2">
                {bundles.map((bundle) => (
                  <InventoryButton
                    key={bundle.ksuid}
                    title={bundle.name || bundle.ksuid}
                    subtitle={bundle.primary_price_name}
                    price={bundle.primary_price}
                    status={bundle.status}
                    selected={selectedBundleIds.has(bundle.ksuid)}
                    onToggle={() => onToggleBundle(bundle)}
                  />
                ))}
              </div>
            </div>
          ) : null}

          {items.length > 0 ? (
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Items</h3>
              <div className="mt-3 space-y-2">
                {items.map((item) => {
                  const isSelected = selectedItemIds.has(item.ksuid);
                  const isIncluded = includedItemIds.has(item.ksuid);
                  return (
                    <InventoryButton
                      key={item.ksuid}
                      title={item.name || item.ksuid}
                      subtitle={item.primary_price_name}
                      price={item.primary_price}
                      status={item.status}
                      selected={isSelected}
                      included={isIncluded}
                      onToggle={() => onToggleItem(item)}
                    />
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </BuilderCard>
  );
};

export default InventorySelectorCard;
