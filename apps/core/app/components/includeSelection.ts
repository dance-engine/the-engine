import { BundleTypeExtended, ItemType } from "@dance-engine/schemas/bundle";
import { findCheapestCombination } from "@dance-engine/ui/passCalculator";

export const buildIncludeSelection = ({
  requestedBundleIds,
  requestedItemIds,
  bundles,
  items,
}: {
  requestedBundleIds: string[];
  requestedItemIds: string[];
  bundles: BundleTypeExtended[];
  items: ItemType[];
}) => {
  const bundleMap = new Map(bundles.map((bundle) => [bundle.ksuid, bundle]));
  const itemMap = new Map(items.map((item) => [item.ksuid, item]));

  const requestedItems = Array.from(
    new Map(
      [
        ...requestedItemIds.map((itemId) => itemMap.get(itemId)).filter((item): item is ItemType => Boolean(item)),
        ...requestedBundleIds.flatMap((bundleId) =>
          (bundleMap.get(bundleId)?.includes || [])
            .map((itemId) => itemMap.get(itemId))
            .filter((item): item is ItemType => Boolean(item)),
        ),
      ].map((item) => [item.ksuid, item]),
    ).values(),
  );

  const cheapestCombination = findCheapestCombination(requestedItems, bundles);
  const chosenBundleIds: string[] = cheapestCombination.chosenBundles.map((bundle) => bundle.ksuid);
  const chosenItemIds: string[] = cheapestCombination.chosenItems.map((item) => item.ksuid);
  const includedItemIds = Array.from(
    new Set(cheapestCombination.chosenBundles.flatMap((bundle) => bundle.includes || [])),
  );
  const includeKeys = [
    ...cheapestCombination.chosenBundles.map((bundle) => `BUNDLE#${bundle.ksuid}`),
    ...cheapestCombination.chosenItems.map((item) => `ITEM#${item.ksuid}`),
  ];
  const expandedIncludes = [
    ...cheapestCombination.chosenBundles
      .map((bundle) => bundleMap.get(bundle.ksuid))
      .filter((bundle): bundle is BundleTypeExtended => Boolean(bundle))
      .map((bundle) => ({ ...bundle, entity_type: bundle.entity_type || "BUNDLE" })),
    ...cheapestCombination.chosenItems
      .map((item) => itemMap.get(item.ksuid))
      .filter((item): item is ItemType => Boolean(item))
      .map((item) => ({ ...item, entity_type: item.entity_type || "ITEM" })),
  ];

  return {
    chosenBundleIds,
    chosenItemIds,
    includedItemIds,
    includeKeys,
    expandedIncludes,
  };
};
