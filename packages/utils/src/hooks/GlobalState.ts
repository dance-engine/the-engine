'use client';

import { useStateMachine } from 'little-state-machine';
import { setCurrentOrg, setCurrentEvent } from '../actions/globalState';

// Register actions at usage site
export function useGlobalState() {
  return useStateMachine({actions: { setCurrentOrg, setCurrentEvent }});
}

