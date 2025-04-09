import { createStore } from 'little-state-machine';

export type GlobalState = {
  currentOrg: string | null;
  currentEvent: string | null;
};

const initialState: GlobalState = {
  currentOrg: null,
  currentEvent: null,
};

if (typeof window !== 'undefined') {
  createStore(initialState, {
    name: 'dance-engine-state',
    storageType: window.localStorage,
    persist: 'action'
  });
}
