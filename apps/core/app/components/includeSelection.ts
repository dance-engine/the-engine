import { BundleTypeExtended, ItemType } from "@dance-engine/schemas/bundle";

type CheapestResult = {
  totalCost: number;
  chosenBundles: BundleTypeExtended[];
  chosenItems: { ksuid: string; primary_price: number }[];
};

const findCheapestCombination = (
  items: ItemType[],
  bundles: BundleTypeExtended[],
): CheapestResult => {
  if (items.length === 0) {
    return { totalCost: 0, chosenBundles: [], chosenItems: [] };
  }

  const indexByItem: Record<string, number> = {};
  items.forEach((item, index) => {
    indexByItem[item.ksuid] = index;
  });

  const targetMask = (1 << items.length) - 1;

  type BuyableSet =
    | { kind: "bundle"; idx: number; mask: number; cost: number }
    | { kind: "item"; idx: number; mask: number; cost: number };

  const sets: BuyableSet[] = [];

  bundles.forEach((bundle, bundleIndex) => {
    let mask = 0;
    bundle.includes.forEach((itemId) => {
      const bit = indexByItem[itemId];
      if (bit !== undefined) {
        mask |= 1 << bit;
      }
    });
    if (mask !== 0) {
      sets.push({ kind: "bundle", idx: bundleIndex, mask, cost: bundle.primary_price });
    }
  });

  items.forEach((item, itemIndex) => {
    sets.push({ kind: "item", idx: itemIndex, mask: 1 << itemIndex, cost: item.primary_price });
  });

  const stateCount = 1 << items.length;
  const dp = new Array<number>(stateCount).fill(Infinity);
  const prev = new Array<number>(stateCount).fill(-1);
  const choice = new Array<number>(stateCount).fill(-1);
  dp[0] = 0;

  for (let mask = 0; mask < stateCount; mask += 1) {
    const baseCost = dp[mask];
    if (baseCost === undefined || !Number.isFinite(baseCost)) continue;
    sets.forEach((set, setIndex) => {
      const nextMask = mask | set.mask;
      const nextCost = dp[nextMask] ?? Infinity;
      const cost = baseCost + set.cost;
      if (cost < nextCost) {
        dp[nextMask] = cost;
        prev[nextMask] = mask;
        choice[nextMask] = setIndex;
      }
    });
  }

  const selectedBundleIndices: number[] = [];
  const selectedItemIndices: number[] = [];
  let currentMask = targetMask;

  while (currentMask !== 0) {
    const setIndex = choice[currentMask] ?? -1;
    const previousMask = prev[currentMask] ?? -1;
    if (setIndex === -1 || previousMask === -1) break;
    const set = sets[setIndex];
    if (!set) break;
    if (set.kind === "bundle") {
      selectedBundleIndices.push(set.idx);
    } else {
      selectedItemIndices.push(set.idx);
    }
    currentMask = Number(previousMask);
  }

  const chosenBundles = selectedBundleIndices
    .map((index) => bundles[index])
    .filter((bundle): bundle is BundleTypeExtended => Boolean(bundle));
  const chosenItems = selectedItemIndices
    .map((index) => items[index])
    .filter((item): item is ItemType => Boolean(item))
    .map((item) => ({
      ksuid: item.ksuid,
      primary_price: item.primary_price ?? 0,
    }));

  return {
    totalCost: dp[targetMask] ?? 0,
    chosenBundles,
    chosenItems,
  };
};

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
