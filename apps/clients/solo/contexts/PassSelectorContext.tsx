import { createContext, useReducer } from 'react';
import { BundleTypeExtended } from '@dance-engine/schemas/bundle';

type PassSelectorState = { selected: string[], included: string[][] };

const initialSelection: PassSelectorState = {
  selected: [],
  included: []
};

export const PassSelectorContext = createContext<PassSelectorState>(initialSelection);
export const PassSelectorDispatchContext = createContext<React.Dispatch<BundleTypeExtended>>(null as any);

export function PassSelectorProvider({ children }: { children: React.ReactNode }) {
  const [selection, dispatch] = useReducer(passSelectorReducer, initialSelection);

  return (
    <PassSelectorContext.Provider value={selection}>
      <PassSelectorDispatchContext.Provider value={dispatch}>
        {children}
      </PassSelectorDispatchContext.Provider>
      {<pre className="col-span-full">{JSON.stringify(selection, null, 2)}</pre>}
    </PassSelectorContext.Provider>
  );
}

function passSelectorReducer(_state: PassSelectorState, bundle: BundleTypeExtended): PassSelectorState {

  const removing = _state.selected.includes(bundle.ksuid);
  console.log(`${ removing ? "removing" : "adding"} bundle:`, bundle);
  
  return {
    selected: removing ? _state.selected.filter(id => id !== bundle.ksuid) : [..._state.selected, bundle.ksuid],
    included: removing ? _state.included.filter(incArray => JSON.stringify(incArray) !== JSON.stringify(bundle.includes)) : [..._state.included, bundle.includes]
  };
}