export function setCurrentOrg(state: any, payload: { currentOrg: string | null }) {
  console.log("Update ORG")
  return { ...state, currentOrg: payload.currentOrg };
}

export function setCurrentEvent(state: any, payload: { currentEvent: string | null }) {
  return { ...state, currentEvent: payload.currentEvent };
}
