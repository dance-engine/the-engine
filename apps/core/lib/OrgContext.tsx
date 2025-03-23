'use client'
import { createContext, useContext, useEffect, useState } from "react";

type OrgContextType = {
  orgSlug: string | null;
  setOrgSlug: (id: string) => void;
  orgOptions: string[] | null;
};

const OrgContext = createContext<OrgContextType | undefined>(undefined);

export const OrgProvider = ({ initialOrgSlug, orgOptions, children }: { initialOrgSlug: string | null, orgOptions: string[] | null, children: React.ReactNode }) => {
  // const [orgSlug, setOrgSlug] = useState<string | null>(null);
  const [orgSlug, setOrgSlug] = useState<string | null>(() => {
    // Load from localStorage or fallback to initial prop
    return (
      typeof window !== "undefined" &&
        localStorage.getItem("orgSlug")) ||
        initialOrgSlug ||
      null;
  });


   
  useEffect(() => {
    if (orgSlug) {
      localStorage.setItem("orgSlug", orgSlug);
    }
  }, [orgSlug]);

  return (
    <OrgContext.Provider value={{ orgSlug, setOrgSlug, orgOptions }}>
      {children}
    </OrgContext.Provider>
  );
};

export const useOrg = () => {
  const context = useContext(OrgContext);
  if (!context) throw new Error("useOrg must be used within OrgProvider");
  return context;
};
