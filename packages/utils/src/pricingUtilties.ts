import { BundleTypeExtended, ItemType } from "@dance-engine/schemas/bundle"
import { EventModelType } from "@dance-engine/schemas/events"
// import power from 'power-set'

export function powerSet<T>(arr: readonly T[]): T[][] {
  return arr.reduce<T[][]>(
    (acc, v) => acc.concat(acc.map(s => [...s, v])),
    [[]]
  );
}

const getItemCombinations = (event: EventModelType, selection: string[]) => {
  // console.log("Calculate",selection)
  const items = event.items || {};
  const keys = Object.keys(items).filter(key => selection.includes(key));
  return powerSet(keys);
}

export { getItemCombinations };