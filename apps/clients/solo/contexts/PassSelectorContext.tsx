import React, { createContext, useReducer, useContext, useCallback } from 'react';
import { BundleTypeExtended } from '@dance-engine/schemas/bundle';

type PassSelectorState = { selected: string[]; included: string[][] };

const initialSelection: PassSelectorState = { selected: [], included: [] };

// ---------- Contexts ----------
export const PassSelectorContext = createContext<PassSelectorState>(initialSelection);

type ActionsAPI = {
  toggleBundle: (bundle: BundleTypeExtended) => void;
  toggleItem: (id: string) => void;
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
  | { type: 'toggleBundle'; bundle: BundleTypeExtended }
  | { type: 'toggleItem'; id: string }
  | { type: 'addItem'; id: string }
  | { type: 'removeItem'; id: string }
  | { type: 'reset' };

function reducer(state: PassSelectorState, action: Action): PassSelectorState {
  console.log('pass Selector Action:', action);
  switch (action.type) {
    case 'toggleBundle': {
      const { ksuid, includes } = action.bundle;

      const selectedIdx = state.selected.indexOf(ksuid);
      const includedIdx = state.included.findIndex((arr) => incEquals(arr, includes));

      // Prefer removing the row whose included matches by value; otherwise use the ksuid row.
      const present = selectedIdx !== -1 && includedIdx !== -1

      if (present) {
        return {
          selected: state.selected.filter((_, i) => i !== selectedIdx),
          included: state.included.filter((_, i) => i !== includedIdx),
        };
      }

      // Add (append) if not found
      return {
        selected: [...state.selected, ksuid],
        included: [...state.included, includes],
      };
    }

    case 'toggleItem': {
      const { id } = action;
      const idx = state.selected.indexOf(id);
      if (idx !== -1) {
        // Only touch selected for items
        return {
          selected: state.selected.filter((_, i) => i !== idx),
          included: state.included,
        };
      }
      return {
        selected: [...state.selected, id],
        included: state.included,
      };
    }

    case 'addItem': {
      const { id } = action;
      if (state.selected.includes(id)) return state;
      return { selected: [...state.selected, id], included: state.included };
    }

    case 'removeItem': {
      const { id } = action;
      const idx = state.selected.indexOf(id);
      if (idx === -1) return state;
      return {
        selected: state.selected.filter((_, i) => i !== idx),
        included: state.included,
      };
    }

    case 'reset':
      return initialSelection;

    default:
      return state;
  }
}

// ---------- Provider with functions ----------
export function PassSelectorProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialSelection);

  const toggleBundle = useCallback((bundle: BundleTypeExtended) => {
    dispatch({ type: 'toggleBundle', bundle });
  }, []);

  const toggleItem = useCallback((id: string) => {
    dispatch({ type: 'toggleItem', id });
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
      <pre className="col-span-full mt-6">{JSON.stringify(state, null, 2)}</pre>
    </PassSelectorContext.Provider>
  );
}

// ---------- Hooks ----------
export function usePassSelectorState() {
  return useContext(PassSelectorContext);
}
export function usePassSelectorActions() {
  const ctx = useContext(PassSelectorActionsContext);
  if (!ctx) throw new Error('usePassSelectorActions must be used within PassSelectorProvider');
  return ctx;
}
