import { BundleTypeExtended, ItemType } from "@dance-engine/schemas/bundle";

export type PriceTier = "standard" | "student";

export type PricedEntity = ItemType | BundleTypeExtended;

const isStudentLabel = (label?: string) =>
  label?.trim().toLowerCase() === "student";

export const hasStudentPricing = (entity?: Partial<PricedEntity> | null) =>
  Boolean(
    entity &&
      typeof entity.secondary_price === "number" &&
      entity.secondary_price >= 0 &&
      isStudentLabel(entity.secondary_price_name),
  );

export const getPriceInCents = (
  entity: Partial<PricedEntity> | null | undefined,
  tier: PriceTier,
) => {
  if (!entity) return 0;

  if (tier === "student" && hasStudentPricing(entity)) {
    return entity.secondary_price || 0;
  }

  return entity.primary_price || 0;
};

export const getPriceName = (
  entity: Partial<PricedEntity> | null | undefined,
  tier: PriceTier,
) => {
  if (!entity) return "Price";

  if (tier === "student" && hasStudentPricing(entity)) {
    return entity.secondary_price_name || "Student";
  }

  return entity.primary_price_name || "Price";
};

export const getStripePriceId = (
  entity: Partial<PricedEntity> | null | undefined,
  tier: PriceTier,
) => {
  if (!entity) return undefined;

  if (tier === "student" && hasStudentPricing(entity)) {
    return entity.stripe_secondary_price_id || entity.stripe_price_id;
  }

  return entity.stripe_primary_price_id || entity.stripe_price_id;
};

export const formatPounds = (amountInPence: number) =>
  `£${(amountInPence / 100).toFixed(2)}`;
