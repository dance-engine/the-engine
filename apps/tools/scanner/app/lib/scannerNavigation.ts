import type { Dispatch, SetStateAction } from "react";

export type ScannerViewMode = "orgs" | "events" | "scanner";

type ScannerNavigationSetters<TTicket> = {
  setViewMode: Dispatch<SetStateAction<ScannerViewMode>>;
  setSelectedOrg: Dispatch<SetStateAction<string>>;
  setSelectedEvent: Dispatch<SetStateAction<string>>;
  setQrInput: Dispatch<SetStateAction<string>>;
  setTicket: Dispatch<SetStateAction<TTicket | null>>;
  setNotice: Dispatch<SetStateAction<string>>;
  setError: Dispatch<SetStateAction<string>>;
};

export function createScannerNavigation<TTicket>(
  setters: ScannerNavigationSetters<TTicket>,
) {
  const clearScanState = () => {
    setters.setQrInput("");
    setters.setTicket(null);
    setters.setNotice("");
    setters.setError("");
  };

  return {
    selectOrganisation(orgId: string) {
      setters.setSelectedOrg(orgId);
      setters.setSelectedEvent("");
      clearScanState();
      setters.setViewMode("events");
    },
    backToOrganisations() {
      setters.setSelectedOrg("");
      setters.setSelectedEvent("");
      clearScanState();
      setters.setViewMode("orgs");
    },
    selectEvent(eventId: string) {
      setters.setSelectedEvent(eventId);
      clearScanState();
      setters.setViewMode("scanner");
    },
    backToEvents() {
      setters.setSelectedEvent("");
      clearScanState();
      setters.setViewMode("events");
    },
  };
}