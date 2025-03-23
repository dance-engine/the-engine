'use client'
// components/OrgSelector.tsx
import { useOrg } from "./OrgContext";
import { useEffect } from "react"; 
import { HiChevronDown } from "react-icons/hi";
export default function OrgSelector() {
  const { orgSlug, setOrgSlug, orgOptions } = useOrg();

  // if (orgOptions && orgOptions.length === 1 && !orgSlug) {
  //   setOrgSlug(orgOptions[0] || '');
  // }

  useEffect(() => {
    console.log("setting the orgSAlug",orgSlug)
    if (orgOptions?.length === 1 && !orgSlug) {
      setOrgSlug(orgOptions[0] || "");
    }
  }, [orgOptions, orgSlug, setOrgSlug]);

  return (
    <div className="mt-0 grid grid-cols-1">
      <select
        value={orgSlug ?? ""}
        onChange={(e) => setOrgSlug(e.target.value)}
        // className="border border-white text-white rounded px-3 py-1"
        className="col-start-1 row-start-1 w-full appearance-none rounded-md bg-dark-background 
        py-1.5 pr-8 pl-3 text-base text-gray-100 outline-1 -outline-offset-1 outline-dark-highlight focus:outline-2 focus:-outline-offset-2 focus:outline-dark-highlight sm:text-sm/6"

      >
        <option value="">Select organisation</option>
        {(orgOptions || []).map((org) => (
          <option key={org} value={org}>
            {org}
          </option>
        ))}
      </select>
      <HiChevronDown
      aria-hidden="true"
      className="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end text-gray-100 sm:size-4"
      />
    </div>
  );
}
