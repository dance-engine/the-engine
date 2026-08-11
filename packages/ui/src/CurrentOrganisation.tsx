"use client";

import { useOrgContext } from "@dance-engine/utils/OrgContext";

export function CurrentOrganisation({
  variant,
}: {
  variant: "sidebar" | "mobile";
}) {
  const { activeOrg, isLoaded } = useOrgContext();
  const organisationName = isLoaded
    ? activeOrg || "No organisation selected"
    : "Loading…";

  if (variant === "mobile") {
    return (
      <div
        className="flex min-h-8 items-center bg-dark-background px-4 text-xs text-white min-[1150px]:hidden"
        aria-live="polite"
      >
        <span className="mr-2 text-primary-text">Current organisation:</span>
        <span className="truncate font-semibold" title={organisationName}>
          {organisationName}
        </span>
      </div>
    );
  }

  return (
    <div className="border-y border-white/10 py-1" aria-live="polite">
      <div className="text-xs text-primary-text">Current organisation</div>
      <div
        className="mt-1 truncate text-sm font-semibold text-white"
        title={organisationName}
      >
        {organisationName}
      </div>
    </div>
  );
}
