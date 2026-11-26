"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useOrgContext } from "@dance-engine/utils/OrgContext";
import useClerkSWR from "@dance-engine/utils/clerkSWR";
import { nameFromHypenated } from "@dance-engine/utils/textHelpers";

type PublicOrganisation = { organisation?: string; name?: string };

const ORGS_API_URL = `${process.env.NEXT_PUBLIC_DANCE_ENGINE_API}/public/organisations`;
const SEARCH_THRESHOLD = 8;

const ChevronIcon = ({ open }: { open: boolean }) => (
  <svg
    className={`size-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
    viewBox="0 0 20 20"
    fill="currentColor"
    aria-hidden="true"
  >
    <path
      fillRule="evenodd"
      d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
      clipRule="evenodd"
    />
  </svg>
);

/** Orgs the user can switch to. Super admins ("*") get every org from the public API. */
const useSwitchableOrgs = (enabled: boolean) => {
  const { availableOrgs } = useOrgContext();
  const isSuperAdmin = availableOrgs.includes("*");
  const { data, isLoading } = useClerkSWR(enabled ? ORGS_API_URL : null, {
    revalidateOnFocus: false,
  });

  return useMemo(() => {
    const publicOrgs: PublicOrganisation[] = data?.organisations ?? [];
    const names = new Map(
      publicOrgs
        .filter((org) => org.organisation)
        .map((org) => [org.organisation as string, org.name || nameFromHypenated(org.organisation as string)]),
    );

    const slugs = new Set(availableOrgs.filter((slug) => slug !== "*"));
    if (isSuperAdmin) names.forEach((_name, slug) => slugs.add(slug));

    const orgs = [...slugs]
      .map((slug) => ({ slug, name: names.get(slug) ?? nameFromHypenated(slug) }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return { orgs, names, isLoading: isSuperAdmin && isLoading };
  }, [availableOrgs, data, isLoading, isSuperAdmin]);
};

export function CurrentOrganisation({
  variant,
}: {
  variant: "sidebar" | "mobile";
}) {
  const router = useRouter();
  const { activeOrg, isLoaded, switchOrg, availableOrgs } = useOrgContext();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [switchingTo, setSwitchingTo] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Only load org names once the user has shown interest (or to label the current org).
  const { orgs, names, isLoading } = useSwitchableOrgs(isLoaded && availableOrgs.length > 0);

  const canSwitch = isLoaded && (availableOrgs.includes("*") || availableOrgs.length > 1);
  const organisationName = !isLoaded
    ? "Loading…"
    : activeOrg
      ? names.get(activeOrg) ?? nameFromHypenated(activeOrg)
      : "No organisation selected";

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const handleSwitch = async (slug: string) => {
    if (slug === activeOrg) {
      setOpen(false);
      return;
    }
    setSwitchingTo(slug);
    try {
      await switchOrg(slug);
      setOpen(false);
      // Server-rendered pages read the last org from Clerk, so refresh them too.
      router.refresh();
    } finally {
      setSwitchingTo(null);
    }
  };

  const filtered = query
    ? orgs.filter(
        (org) =>
          org.name.toLowerCase().includes(query.toLowerCase()) ||
          org.slug.includes(query.toLowerCase()),
      )
    : orgs;

  const list = (
    <div
      id={`org-switcher-${variant}`}
      className={
        variant === "mobile"
          ? "absolute inset-x-0 top-full z-50 max-h-[70vh] overflow-y-auto border-b border-white/10 bg-dark-background p-2 shadow-lg"
          : "mt-1 rounded-md bg-dark-highlight/40 p-1"
      }
    >
      {orgs.length > SEARCH_THRESHOLD && (
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Find organisation…"
          aria-label="Find organisation"
          autoFocus
          className="mb-1 w-full rounded-md border border-white/10 bg-white/5 px-2 py-1 text-sm text-white placeholder:text-primary-text"
        />
      )}
      {isLoading && orgs.length === 0 ? (
        <p className="px-2 py-1 text-sm text-primary-text">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="px-2 py-1 text-sm text-primary-text">No matches</p>
      ) : (
        <ul role="listbox" aria-label="Organisations" className="max-h-72 overflow-y-auto">
          {filtered.map((org) => {
            const isActive = org.slug === activeOrg;
            return (
              <li key={org.slug} role="option" aria-selected={isActive}>
                <button
                  type="button"
                  onClick={() => handleSwitch(org.slug)}
                  disabled={switchingTo !== null}
                  className={`flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-dark-highlight hover:text-white disabled:cursor-wait ${
                    isActive ? "font-semibold text-white" : "text-primary-text"
                  }`}
                >
                  <span className="truncate" title={org.name}>
                    {switchingTo === org.slug ? "Switching…" : org.name}
                  </span>
                  {isActive && (
                    <svg className="size-4 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path
                        fillRule="evenodd"
                        d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );

  const triggerProps = {
    type: "button" as const,
    onClick: () => setOpen((value) => !value),
    "aria-expanded": open,
    "aria-controls": `org-switcher-${variant}`,
    "aria-haspopup": "listbox" as const,
  };

  if (variant === "mobile") {
    return (
      <div ref={containerRef} className="relative min-[1150px]:hidden" aria-live="polite">
        {canSwitch ? (
          <button
            {...triggerProps}
            className="flex min-h-8 w-full items-center bg-dark-background px-4 text-left text-xs text-white"
          >
            <span className="mr-2 text-primary-text">Current organisation:</span>
            <span className="truncate font-semibold" title={organisationName}>
              {organisationName}
            </span>
            <span className="ml-auto pl-2 text-primary-text">
              <ChevronIcon open={open} />
            </span>
          </button>
        ) : (
          <div className="flex min-h-8 items-center bg-dark-background px-4 text-xs text-white">
            <span className="mr-2 text-primary-text">Current organisation:</span>
            <span className="truncate font-semibold" title={organisationName}>
              {organisationName}
            </span>
          </div>
        )}
        {open && list}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="border-y border-white/10 py-1" aria-live="polite">
      {canSwitch ? (
        <button
          {...triggerProps}
          className="-mx-2 flex w-[calc(100%+1rem)] items-center gap-2 rounded-md px-2 py-1 text-left hover:bg-dark-highlight"
        >
          <span className="min-w-0 flex-1">
            <span className="block text-xs text-primary-text">Current organisation</span>
            <span className="mt-1 block truncate text-sm font-semibold text-white" title={organisationName}>
              {organisationName}
            </span>
          </span>
          <span className="text-primary-text">
            <ChevronIcon open={open} />
          </span>
        </button>
      ) : (
        <>
          <div className="text-xs text-primary-text">Current organisation</div>
          <div className="mt-1 truncate text-sm font-semibold text-white" title={organisationName}>
            {organisationName}
          </div>
        </>
      )}
      {open && list}
    </div>
  );
}
