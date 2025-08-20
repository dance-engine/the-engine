import React, { createContext, useReducer, useContext, useCallback } from 'react';
import { BundleTypeExtended, ItemType} from '@dance-engine/schemas/bundle';
import { findCheapestCombination } from "@/contexts/passCalculator";
import { EventModelType } from '@dance-engine/schemas/events';

type PassSelectorState = { selected: string[]; selectedPrices: number[]; selectedTypes: string[]; included: string[][], includedPrices: number[][], event: EventModelType | null };

const initialSelection: PassSelectorState = { selected: [], selectedTypes: [], selectedPrices: [], included: [], includedPrices: [], event: null };

// ---------- Contexts ----------
export const PassSelectorContext = createContext<PassSelectorState>(initialSelection);

type ActionsAPI = {
  toggleBundle: (bundle: BundleTypeExtended, items: Record<string, ItemType>) => void;
  toggleItem: (item: ItemType) => void;
  addItem: (id: string) => void;
  removeItem: (id: string) => void;
  reset: () => void;
};
export const PassSelectorActionsContext = createContext<ActionsAPI | undefined>(undefined);

// ---------- Helpers ----------
const incEquals = (a: string[], b: string[]) =>
  JSON.stringify(a) === JSON.stringify(b);

// ---------- Reducer ----------
type Action =
  | { type: 'toggleBundle'; bundle: BundleTypeExtended, items: Record<string, ItemType> }
  | { type: 'toggleItem'; item: ItemType }
  | { type: 'addItem'; id: string }
  | { type: 'removeItem'; id: string }
  | { type: 'reset' };

function reducer(state: PassSelectorState, action: Action): PassSelectorState {
  console.log('pass Selector Action:', action);
  switch (action.type) {
    case 'toggleBundle': {
      const { ksuid, includes, primary_price } = action.bundle;
      const items  = action.items

      const selectedIdx = state.selected.indexOf(ksuid);
      const includedIdx = state.included.findIndex((arr) => incEquals(arr, includes));

      // Prefer removing the row whose included matches by value; otherwise use the ksuid row.
      const present = selectedIdx !== -1 && includedIdx !== -1


      if (present) {
        const newState = {
          selected: state.selected.filter((_, i) => i !== selectedIdx),
          included: state.included.filter((_, i) => i !== includedIdx),
          selectedTypes: state.selectedTypes.filter((_, i) => i !== selectedIdx),
          selectedPrices: state.selectedPrices.filter((_, i) => i !== selectedIdx),
          includedPrices: state.includedPrices.filter((_, i) => i !== includedIdx),
          event: state.event || null
        };
        console.log('State post Remove:', buildBestCombo(newState))
        return buildBestCombo(newState)
      }

      // Add (append) if not found
      const newState = {
        selected: [...state.selected, ksuid],
        selectedTypes: [...state.selectedTypes, "bundle"],
        selectedPrices: [...state.selectedPrices, primary_price],
        included: [...state.included, includes],
        includedPrices: [...state.included, includes].map((group) => { return group.map(ksuid => items[ksuid]?.primary_price || 0 ) }),
        event: state.event || null
      };
      console.log('State post Append:', buildBestCombo(newState))

      return buildBestCombo(newState)
    }

    case 'toggleItem': {
      const { ksuid, primary_price } = action.item;
      const idx = state.selected.indexOf(ksuid);

      console.log('State:', buildBestCombo(state))

      if (idx !== -1) {
        // Only touch selected for items
        const newState = {
          selected: state.selected.filter((_, i) => i !== idx),
          selectedTypes: state.selectedTypes.filter((_, i) => i !== idx),
          selectedPrices: state.selectedPrices.filter((_, i) => i !== idx),
          included: state.included,
          includedPrices: state.includedPrices.filter((_, i) => i !== idx),
          event: state.event || null
        };
        console.log('State post Remove Item:', buildBestCombo(newState))
        return buildBestCombo(newState)
      }
      const newState = {
        selected: [...state.selected, ksuid],
        selectedTypes: [...state.selectedTypes, "item"],
        selectedPrices: [...state.selectedPrices, primary_price],
        included: state.included,
        includedPrices: state.includedPrices,
        event: state.event || null
      };
      console.log('State post Append Item:', buildBestCombo(newState))
      return buildBestCombo(newState)
    }

    case 'addItem': {
      const { id } = action;
      if (state.selected.includes(id)) return state;
      return state;
    }

    case 'removeItem': {
      const { id } = action;
      const idx = state.selected.indexOf(id);
      if (idx === -1) return state;
      return state;
    }

    case 'reset':
      return initialSelection;

    default:
      return state;
  }
}

// ---------- Provider with functions ----------
export function PassSelectorProvider({ event, children }: { event: EventModelType; children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {...initialSelection, event});

  const toggleBundle = useCallback((bundle: BundleTypeExtended, items: Record<string, ItemType>) => {
    dispatch({ type: 'toggleBundle', bundle, items  });
  }, []);

  const toggleItem = useCallback((item: ItemType) => {
    dispatch({ type: 'toggleItem', item });
  }, []);

  const addItem = useCallback((id: string) => {
    dispatch({ type: 'addItem', id });
  }, []);

  const removeItem = useCallback((id: string) => {
    dispatch({ type: 'removeItem', id });
  }, []);

  const reset = useCallback(() => dispatch({ type: 'reset' }), []);

  const actions: ActionsAPI = { toggleBundle, toggleItem, addItem, removeItem, reset };

  return (
    <PassSelectorContext.Provider value={state}>
      <PassSelectorActionsContext.Provider value={actions}>
        {children}
      </PassSelectorActionsContext.Provider>
      <pre className="hidden col-span-full mt-6">
        Selected:
        {JSON.stringify(state.selected, null, 2)}
        Included:
        {JSON.stringify(state.included, null, 2)}
      </pre>
    </PassSelectorContext.Provider>
  );
}

// ---------- Hooks ----------
export function usePassSelectorState() {
  const ctx = useContext(PassSelectorContext);
  if (!ctx) throw new Error('usePassSelectorActions must be used within PassSelectorProvider');
  return ctx;
}
export function usePassSelectorActions() {
  const ctx = useContext(PassSelectorActionsContext);
  if (!ctx) throw new Error('usePassSelectorActions must be used within PassSelectorProvider');
  return ctx;
}

const buildBestCombo = (selectorState: PassSelectorState) => {
  const itemsSpecific = selectorState.selected.map((_, i) => { 
    return { type: selectorState.selectedTypes[i], ksuid: selectorState.selected[i], primary_price: selectorState.selectedPrices[i] } as unknown as ItemType & { type: string }; ;
  }).filter(item => item.type === "item");
  const itemsFromBundles = Array.from(new Set(
      selectorState.included.map((group,gIdx) => {
      return group.map((_, iIdx) => {
        return { type: 'item', ksuid: _, primary_price: selectorState.includedPrices[gIdx][iIdx] } as unknown as ItemType & { type: string };
      });
    }).flat()
  ));
  // Remove duplicates from everything your trying to buy
  const requestedItems = [...new Map([...itemsSpecific, ...itemsFromBundles].map(item => [item.ksuid, item])).values()]
  const suggestedItems = findCheapestCombination(requestedItems, selectorState.event?.bundles || [])
  const bestState = {
    selected: [...suggestedItems.chosenBundles.map(bundle => bundle.ksuid), ...suggestedItems.chosenItems.map(item => item.ksuid)],
    selectedTypes: [...suggestedItems.chosenBundles.map(() => 'bundle'), ...suggestedItems.chosenItems.map(() => 'item')],
    selectedPrices: [...suggestedItems.chosenBundles.map(bundle => bundle.primary_price), ...suggestedItems.chosenItems.map(item => item.primary_price)],
    included: Array.from(new Set([...suggestedItems.chosenBundles.map(bundle => bundle.includes)])),
    includedPrices: [...suggestedItems.chosenBundles.map(bundle => bundle.includes.map(item_ksuid => selectorState.event?.items?.[item_ksuid]?.primary_price || 0))],
    event: selectorState.event
  }
  return bestState
};
