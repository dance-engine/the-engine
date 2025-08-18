import { ItemType, BundleTypeExtended } from "@dance-engine/schemas/bundle";
export type CheapestResult = {
  totalCost: number;
  chosenBundles: BundleTypeExtended[];
  chosenItems: { ksuid: string; primary_price: number }[];
  debug?: string | number | Record<string, string | number | number[] | string[]>;
};
/**
 * Find the cheapest combination of bundles and single items to cover the requested items.
 * items: the *requested* items (each must include primary_price)
 * bundles: available bundles (includes can overlap; items not requested are ignored)
 */
export function findCheapestCombination(
  items: ItemType[],
  bundles: BundleTypeExtended[]
): CheapestResult {
  console.log("Calculating based on \nitems:", items, "\nbundles:", bundles);

  if (items.length === 0) {
    return { totalCost: 0, chosenBundles: [], chosenItems: [], debug: "items empty" };
  }

  // Guard: for very large target sets, you may want a greedy fallback
  if (items.length > 26) {
    return greedyFallback(items, bundles);
  }

  // Map requested items to bit positions
  const indexByItem: Record<string, number> = {};
  items.forEach((it, i) => (indexByItem[it.ksuid] = i));
  const targetMask = (1 << items.length) - 1;

  // Build "sets" you can buy: all bundles (intersected with target) + singleton items
  type BuyableSet =
    | { kind: 'bundle'; idx: number; mask: number; cost: number }
    | { kind: 'item'; idx: number; mask: number; cost: number };

  const sets: BuyableSet[] = [];

  // Bundles (only keep coverage that intersects requested items)
  bundles.forEach((b, bi) => {
    let mask = 0;
    for (const id of b.includes) {
      const bit = indexByItem[id];
      if (bit !== undefined) mask |= 1 << bit;
    }
    if (mask !== 0) {
      sets.push({ kind: 'bundle', idx: bi, mask, cost: b.primary_price });
    }
  });

  // Singletons (buy individual requested items)
  items.forEach((it, ii) => {
    const mask = 1 << ii;
    sets.push({ kind: 'item', idx: ii, mask, cost: it.primary_price });
  });

  // Bitmask DP
  const N = 1 << items.length;
  const dp = new Array<number>(N).fill(Infinity);
  const prev = new Array<number>(N).fill(-1);    // previous mask
  const choice = new Array<number>(N).fill(-1);  // index into sets[]

  dp[0] = 0;

  for (let mask = 0; mask < N; mask++) {
    const base = dp[mask];
    if (!isFinite(base)) continue;

    for (let s = 0; s < sets.length; s++) {
      const set = sets[s];
      const nextMask = mask | set.mask;
      const cost = base + set.cost;
      if (cost < dp[nextMask]) {
        dp[nextMask] = cost;
        prev[nextMask] = mask;
        choice[nextMask] = s;
      }
    }
  }

  // Reconstruct selection
  const selectedBundles: number[] = [];
  const selectedItems: number[] = [];

  let cur = targetMask;
  if (!isFinite(dp[cur])) {
    // No exact cover (shouldn’t happen if singletons exist), return greedy
    return greedyFallback(items, bundles);
  }

  while (cur !== 0) {
    const sIdx = choice[cur];
    const p = prev[cur];
    if (sIdx === -1 || p === -1) break; // safety
    const set = sets[sIdx];
    if (set.kind === 'bundle') selectedBundles.push(set.idx);
    else selectedItems.push(set.idx);
    cur = p;
  }

  // Build result
  const chosenBundles = selectedBundles.map((bi) => {
    const b = bundles[bi];
    return { ...b };
  });

  const chosenItems = selectedItems.map((ii) => {
    const it = items[ii];
    return { ...it };
  });

  return {
    totalCost: dp[targetMask],
    chosenBundles,
    chosenItems,
    debug: {
      dp,
      prev,
      choice,
    },
  };
}


function greedyFallback(items: ItemType[], bundles: BundleTypeExtended[]): CheapestResult {
  const indexByItem: Record<string, number> = {};
  items.forEach((it, i) => (indexByItem[it.ksuid] = i));
  const uncovered = new Set(items.map(it => it.ksuid));

  const chosenBundles: BundleTypeExtended[] = [];
  const chosenItems: ItemType[] = [];

  // Precompute bundle coverage over requested set
  const bundleCover: { b: BundleTypeExtended; covers: Set<string> }[] = bundles.map(b => ({
    b,
    covers: new Set(b.includes.filter(id => id in indexByItem)),
  })).filter(x => x.covers.size > 0);

  while (uncovered.size > 0) {
    // Best bundle by cost per *newly* covered item
    let bestBundle: { b: BundleTypeExtended; newCover: string[]; score: number } | null = null;

    for (const { b, covers } of bundleCover) {
      const newly = [...covers].filter(id => uncovered.has(id));
      if (newly.length === 0) continue;
      const score = b.primary_price / newly.length; // lower is better
      if (!bestBundle || score < bestBundle.score) {
        bestBundle = { b, newCover: newly, score };
      }
    }

    // Best single item (fallback if bundles are poor)
    let bestItem: ItemType | null = null;
    for (const it of items) {
      if (uncovered.has(it.ksuid)) {
        if (!bestItem || it.primary_price < bestItem.primary_price) bestItem = it;
      }
    }

    // Decide: bundle vs best single
    const takeBundle =
      bestBundle &&
      (!bestItem || bestBundle.b.primary_price / bestBundle.newCover.length <= bestItem.primary_price);

    if (takeBundle && bestBundle) {
      chosenBundles.push(bestBundle.b);
      for (const id of bestBundle.newCover) uncovered.delete(id);
    } else if (bestItem) {
      chosenItems.push(bestItem);
      uncovered.delete(bestItem.ksuid);
    } else {
      // Shouldn't happen, but guard to break potential loop
      break;
    }
  }

  const totalCost =
    chosenBundles.reduce((s, b) => s + b.primary_price, 0) +
    chosenItems.reduce((s, it) => s + it.primary_price, 0);

  return {
    totalCost,
    chosenBundles: chosenBundles.map(b => ({ ksuid: b.ksuid, name: b.name, primary_price: b.primary_price } as BundleTypeExtended)),
    chosenItems: chosenItems.map(it => ({ ksuid: it.ksuid, name: it.name, primary_price: it.primary_price } as ItemType)),
  };
}
