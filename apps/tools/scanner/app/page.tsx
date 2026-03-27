"use client";

import { SignInButton, SignOutButton, SignedIn, SignedOut, useUser } from "@clerk/nextjs";
import useClerkSWR, { CorsError } from "@dance-engine/utils/clerkSWR";
import { useEffect, useMemo, useState } from "react";
import DataLoading from "./components/DataLoading";
import FullPageWarning from "./components/FullPageWarning";
import QrReader from "./components/QrReader";
import ScannerActionOverlay from "./components/ScannerActionOverlay";
import ScannerHeader from "./components/ScannerHeader";
import SelectionList from "./components/SelectionList";
import TopActionBar from "./components/TopActionBar";
import { createScannerNavigation } from "./lib/scannerNavigation";
import type {
  EventsApiEvent,
  OrgPermissions,
  PublicOrganisation,
  ScannerEvent,
  TicketRecord,
} from "./types/scanner";

export const dynamic = "force-dynamic";

const hasClerkKey = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
const apiBaseUrl = process.env.NEXT_PUBLIC_DANCE_ENGINE_API;
const organisationsApiUrl = apiBaseUrl ? `${apiBaseUrl}/public/organisations` : null;

/**
 * Scanner JWT claim mapping.
 * Keep this as the single source of truth for payload field names.
 */
const SCANNER_JWT_CLAIMS = {
  organization: "o",
  issuer: "iss",
  eventKsuid: "e",
  ticketKsuid: "sub",
} as const;

const SCANNER_JWT_EXPECTED_ISSUER = "DANCEENGINE";

const includesScanningPermission = (roles: string[] | undefined): boolean => {
  if (!Array.isArray(roles)) {
    return false;
  }
  return roles.includes("superadmin") || roles.includes("scanning");
};

const formatOrgLabel = (org: string): string => {
  if (org === "*") {
    return "All Organisations";
  }

  return org
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const asMessage = (value: unknown, fallback: string): string => {
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }
  return fallback;
};

const parseEventDate = (value: string | null | undefined): Date | null => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatEventDate = (value: string | null | undefined): string => {
  const parsed = parseEventDate(value);
  return parsed ? parsed.toLocaleString() : "Date TBC";
};

const isActiveScannerEvent = (event: EventsApiEvent): boolean => {
  const status = event.status?.toLowerCase() ?? "";
  return status === "live";
};

const decodeBase64UrlToString = (value: string): string => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
};

const decodeJwt = (
  token: string,
): { header: Record<string, unknown>; payload: Record<string, unknown> } | null => {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      return null;
    }

    const headerPart = parts[0];
    const payloadPart = parts[1];
    if (!headerPart || !payloadPart) {
      return null;
    }

    const headerRaw = decodeBase64UrlToString(headerPart);
    const payloadRaw = decodeBase64UrlToString(payloadPart);
    const header = JSON.parse(headerRaw) as Record<string, unknown>;
    const payload = JSON.parse(payloadRaw) as Record<string, unknown>;

    return { header, payload };
  } catch {
    return null;
  }
};

const getFirstString = (
  source: Record<string, unknown>,
  keys: string[],
): string | null => {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
};

const getMappedJwtString = (
  payload: Record<string, unknown>,
  claim: keyof typeof SCANNER_JWT_CLAIMS,
): string | null => {
  const raw = payload[SCANNER_JWT_CLAIMS[claim]];
  if (typeof raw === "string" && raw.trim().length > 0) {
    return raw.trim();
  }
  return null;
};

function ScannerWorkspace() {
  const { user, isLoaded } = useUser();
  const [viewMode, setViewMode] = useState<"orgs" | "events" | "scanner">("orgs");
  const [selectedOrg, setSelectedOrg] = useState<string>("");
  const [selectedEvent, setSelectedEvent] = useState<string>("");
  const [qrInput, setQrInput] = useState<string>("");
  const [ticket, setTicket] = useState<TicketRecord | null>(null);
  const [notice, setNotice] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const navigation = createScannerNavigation({
    setViewMode,
    setSelectedOrg,
    setSelectedEvent,
    setQrInput,
    setTicket,
    setNotice,
    setError,
  });

  const orgPermissions = useMemo(() => {
    const metadata = (user?.publicMetadata ?? {}) as { organisations?: unknown };
    const organisations = metadata.organisations;
    if (!organisations || typeof organisations !== "object") {
      return {} as OrgPermissions;
    }
    return organisations as OrgPermissions;
  }, [user?.publicMetadata]);

  const allowedOrgs = useMemo(() => {
    const entries = Object.entries(orgPermissions);
    return entries
      .filter(([org, roles]) => org !== "*" && includesScanningPermission(roles))
      .map(([org]) => org)
      .sort((left, right) => left.localeCompare(right));
  }, [orgPermissions]);

  const hasGlobalScanning = useMemo(
    () => includesScanningPermission(orgPermissions["*"]),
    [orgPermissions],
  );

  const canScan = hasGlobalScanning || allowedOrgs.length > 0;

  const {
    data: organisationsResponse,
    error: organisationsError,
    isLoading: loadingOrganisations,
  } = useClerkSWR(hasGlobalScanning && organisationsApiUrl ? organisationsApiUrl : null, {
    suspense: false,
  });

  const wildcardOrganisations = useMemo(() => {
    if (!organisationsResponse || typeof organisationsResponse !== "object") {
      return [] as Array<{ id: string; label: string }>;
    }

    const organisations = (organisationsResponse as { organisations?: unknown }).organisations;
    if (!Array.isArray(organisations)) {
      return [] as Array<{ id: string; label: string }>;
    }

    return organisations
      .map((item) => item as PublicOrganisation)
      .map((item) => {
        const orgSlug = item.organisation?.trim() ?? "";
        if (!orgSlug) {
          return null;
        }

        return {
          id: orgSlug,
          label: item.name?.trim() || formatOrgLabel(orgSlug),
        };
      })
      .filter((item): item is { id: string; label: string } => Boolean(item))
      .sort((left, right) => left.label.localeCompare(right.label));
  }, [organisationsResponse]);

  useEffect(() => {
    if (!isLoaded || !canScan || selectedOrg) {
      return;
    }

    if (!hasGlobalScanning && allowedOrgs.length === 1) {
      const firstOrg = allowedOrgs.at(0);
      if (firstOrg) {
        setSelectedOrg(firstOrg);
        setViewMode("events");
      }
      return;
    }

    setViewMode("orgs");
  }, [allowedOrgs, canScan, hasGlobalScanning, isLoaded, selectedOrg]);

  const eventsApiUrl = useMemo(() => {
    if (!selectedOrg || !apiBaseUrl) {
      return null;
    }

    return `${apiBaseUrl}/{org}/events`.replace(
      "/{org}",
      `/${selectedOrg}`,
    );
  }, [selectedOrg]);

  const {
    data: eventResponse,
    error: eventsError,
    isLoading: loadingEvents,
  } = useClerkSWR(
    viewMode === "events" || viewMode === "scanner" ? eventsApiUrl : null,
    { suspense: false },
  );

  const events = useMemo<ScannerEvent[]>(() => {
    if (!eventResponse || typeof eventResponse !== "object") {
      return [];
    }

    const maybeEvents = (eventResponse as { events?: unknown }).events;
    if (!Array.isArray(maybeEvents)) {
      return [];
    }

    return maybeEvents
      .map((event) => event as EventsApiEvent)
      .filter((event) => Boolean(event.ksuid?.trim()) && Boolean(event.name?.trim()))
      .filter((event) => isActiveScannerEvent(event))
      .map((event) => ({
        id: event.ksuid!.trim(),
        name: event.name!.trim(),
        startsAt: event.starts_at ?? null,
        endsAt: event.ends_at ?? null,
        status: event.status ?? null,
      }))
      .sort((left, right) => {
        const leftDate = parseEventDate(left.startsAt);
        const rightDate = parseEventDate(right.startsAt);

        if (!leftDate && !rightDate) {
          return left.name.localeCompare(right.name);
        }
        if (!leftDate) {
          return 1;
        }
        if (!rightDate) {
          return -1;
        }
        return leftDate.getTime() - rightDate.getTime();
      });
  }, [eventResponse]);

  const runTicketAction = async (
    action: "check" | "mark-used" | "reset-unused",
    qrCodeOverride?: string,
    options?: { resetTicketOnCheck?: boolean },
  ): Promise<boolean> => {
    if (!selectedOrg || !selectedEvent) {
      setError("Choose an organisation and an event first.");
      return false;
    }

    const qrCode = (qrCodeOverride ?? qrInput).trim();
    if (!qrCode) {
      setError("Scan or enter a QR code first.");
      return false;
    }

    if (qrCode !== qrInput) {
      setQrInput(qrCode);
    }

    if (action === "check" && options?.resetTicketOnCheck) {
      setTicket(null);
    }

    setSubmitting(true);
    setError("");
    setNotice("");

    if (action !== "check") {
      setSubmitting(false);
      setNotice(
        action === "mark-used"
          ? "Marked as used locally. Verification will happen via API later."
          : "Reset to unused locally. Verification will happen via API later.",
      );
      return true;
    }

    const decoded = decodeJwt(qrCode);
    setSubmitting(false);

    if (!decoded) {
      setError("Scanned code is not a readable JWT payload.");
      return false;
    }

    const jwtIssuer = getMappedJwtString(decoded.payload, "issuer");
    if (jwtIssuer !== SCANNER_JWT_EXPECTED_ISSUER) {
      setError(
        `Invalid token issuer. Expected ${SCANNER_JWT_EXPECTED_ISSUER}, received ${jwtIssuer ?? "missing"}.`,
      );
      return false;
    }

    const statusRaw = getFirstString(decoded.payload, ["status", "ticket_status"]);
    const status = statusRaw === "used" || statusRaw === "unused" ? statusRaw : "unused";

    const jwtOrg = getMappedJwtString(decoded.payload, "organization");
    const orgMismatch = Boolean(jwtOrg && jwtOrg !== selectedOrg);

    const mappedTicket: TicketRecord = {
      ticketId: getMappedJwtString(decoded.payload, "ticketKsuid") ?? qrCode,
      attendeeName:
        getFirstString(decoded.payload, ["attendeeName", "attendee_name", "name", "holderName"]) ??
        "Unknown attendee",
      status,
      eventId: getMappedJwtString(decoded.payload, "eventKsuid") ?? selectedEvent,
      eventName:
        getFirstString(decoded.payload, ["eventName", "event_name"]) ??
        selectedEventDetails?.name ??
        "Unknown event",
      qrCode,
      scannedAt: new Date().toISOString(),
      jwtHeader: decoded.header,
      jwtPayload: decoded.payload,
      jwtOrg,
      orgMismatch,
    };

    setTicket(mappedTicket);
    setNotice("JWT decoded locally. Signature is not verified in scanner yet.");
    return true;

    // API flow intentionally disabled while local JWT inspection is being tested.
    // Restore this block when server-side verification is ready.
    // const endpoint =
    //   action === "check"
    //     ? "/api/mock/scanner/check"
    //     : action === "mark-used"
    //       ? "/api/mock/scanner/mark-used"
    //       : "/api/mock/scanner/reset-unused";
    //
    // const result = await requestJson<{ ticket?: TicketRecord; msg?: string }>(endpoint, {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify({
    //     orgId: selectedOrg,
    //     eventId: selectedEvent,
    //     qrCode,
    //   }),
    // });
  };

  const handleQrDetected = async (value: string) => {
    setQrInput(value);
    setError("");
    setNotice("QR captured. Checking ticket...");
    await runTicketAction("check", value, { resetTicketOnCheck: true });
  };

  const clearScannedTicket = () => {
    setTicket(null);
    setQrInput("");
  };

  const handleOverlayAction = async (action: "check" | "mark-used" | "reset-unused") => {
    const success = await runTicketAction(action);
    if (success) {
      clearScannedTicket();
    }
  };

  const selectedEventDetails = useMemo(
    () => events.find((event) => event.id === selectedEvent) ?? null,
    [events, selectedEvent],
  );

  const selectedOrgLabel = useMemo(
    () => (selectedOrg ? formatOrgLabel(selectedOrg) : ""),
    [selectedOrg],
  );

  const orgItems = useMemo(() => {
    if (hasGlobalScanning) {
      return wildcardOrganisations;
    }

    return allowedOrgs.map((org) => ({ id: org, label: formatOrgLabel(org) }));
  }, [allowedOrgs, hasGlobalScanning, wildcardOrganisations]);

  const orgsEmptyState = useMemo(() => {
    if (loadingOrganisations) {
      return null;
    }

    if (organisationsError instanceof CorsError) {
      return (
        <FullPageWarning
          title="Could not reach organisations API"
          description="This looks like a CORS or network issue while loading organisations."
        />
      );
    }

    if (organisationsError) {
      return (
        <FullPageWarning
          title="Failed to load organisations"
          description="The organisations request returned an error."
        />
      );
    }

    if (hasGlobalScanning ) {
      return (
        <FullPageWarning
          title="No organisations found"
          description="Your account has wildcard access, but no organisations were returned."
        />
      );
    }

    return null;
  }, [hasGlobalScanning, loadingOrganisations, organisationsError]);

  const eventItems = useMemo(
    () =>
      events.map((event) => ({
        id: event.id,
        label: event.name,
        description: formatEventDate(event.startsAt),
      })),
    [events],
  );

  const eventsEmptyState = useMemo(() => {
    if (loadingEvents) {
      return null;
    }

    if (eventsError instanceof CorsError) {
      return (
        <FullPageWarning
          title="Could not reach events API"
          description="This looks like a CORS or network issue while loading events."
        />
      );
    }

    if (eventsError || true) {
      return (
        <FullPageWarning
          title="Failed to load events"
          description="The event list request returned an error."
        />
      );
    }

    return (
      <FullPageWarning
        title="No events found"
        description="There are no scannable events for this organisation yet."
      />
    );
  }, [eventsError, loadingEvents]);

  if (!isLoaded) {
    return <DataLoading message="Loading your scanner workspace..." tone="light" fullHeight />;
  }

  if (!canScan) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800">
        <h2 className="text-xl font-semibold">No scanning permission</h2>
        <p className="mt-2 text-sm">
          Your account is signed in, but this organisation profile does not include
          <span className="mx-1 rounded bg-red-100 px-2 py-1 font-mono text-xs">scanning</span>
          or wildcard
          <span className="mx-1 rounded bg-red-100 px-2 py-1 font-mono text-xs">superadmin</span>
          access.
        </p>
        <details className="mt-4 group">
          <summary className="inline-flex cursor-pointer list-none items-center rounded-md border border-red-300 bg-white px-2.5 py-1 text-xs font-semibold text-red-800 hover:bg-red-100">
            Debug
          </summary>
          <pre className="mt-3 overflow-x-auto rounded-lg border border-red-200 bg-slate-900 p-3 text-xs text-slate-100">
{JSON.stringify(
  {
    userId: user?.id ?? null,
    selectedOrg: selectedOrg || null,
    orgPermissions,
    allowedOrgs,
    hasGlobalScanning,
    canScan,
  },
  null,
  2,
)}
          </pre>
        </details>
      </div>
    );
  }

  return (
    <div className="grid h-full min-h-0 grid-rows-[auto_1fr]">
      <ScannerHeader
        selectedOrg={selectedOrgLabel}
        selectedEventName={selectedEventDetails?.name ?? null}
        authAction={
          <SignOutButton>
            <button className="rounded-md border border-dark-outline bg-white/10 px-3 py-1.5 text-xs font-semibold text-primary-text transition hover:bg-white/20">
              Sign out
            </button>
          </SignOutButton>
        }
      />
      <div className="main-space h-full min-h-0">
        {viewMode === "orgs" ? (
          <SelectionList
            title="Choose Organisation"
            items={orgItems}
            loading={hasGlobalScanning ? loadingOrganisations : false}
            emptyState={orgsEmptyState}
            emptyLabel="No organisations found"
            onSelect={(orgId) => navigation.selectOrganisation(orgId)}
          />
        ) : null}

        {viewMode === "events" ? (
          <SelectionList
            title="Choose Event"
            subtitle={selectedOrgLabel}
            onBack={navigation.backToOrganisations}
            items={eventItems}
            loading={loadingEvents}
            emptyLabel="No events found"
            emptyState={eventsEmptyState}
            onSelect={(eventId) => navigation.selectEvent(eventId)}
          />
        ) : null}

        {viewMode === "scanner" ? (
          <>
            <section className="flex h-full min-h-0 justify-center">
              <div className="flex h-full min-h-0 w-full max-w-4xl flex-col justify-between text-2xl font-semibold text-primary-text-highlight">

              <TopActionBar
                title="Scanner"
                onBack={navigation.backToEvents}
              />

              <div className="">
                <QrReader
                  active={!submitting && !ticket}
                  onDetected={(value) => {
                    void handleQrDetected(value);
                  }}
                />
              </div>

              </div>
            </section>

            <ScannerActionOverlay
              open={Boolean(ticket)}
              ticket={ticket}
              submitting={submitting}
              selectedOrg={selectedOrg}
              onAction={(action) => {
                void handleOverlayAction(action);
              }}
              onScanNext={() => {
                clearScannedTicket();
                setNotice("");
                setError("");
              }}
            />

            {error ? (
              <p className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
            ) : null}
            {notice ? (
              <p className="rounded-xl border border-keppel-logo/40 bg-keppel-logo/10 px-4 py-3 text-sm text-keppel-on-light">
                {notice}
              </p>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}

export default function Home() {
  if (!hasClerkKey) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-4 py-10 md:px-8">
        <section className="rounded-2xl border border-amber-300 bg-amber-50 p-6 text-amber-900">
          <h1 className="text-xl font-semibold">Scanner requires Clerk configuration</h1>
          <p className="mt-2 text-sm">
            Set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY in your scanner environment to enable authentication and scanning.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full flex-col gap-4">
      <SignedOut>
        <>
          <ScannerHeader
            selectedOrg=""
            selectedEventName={null}
            authAction={
              <SignInButton>
                <button className="rounded-md border border-dark-outline bg-white/10 px-3 py-1.5 text-xs font-semibold text-primary-text transition hover:bg-white/20">
                  Sign in
                </button>
              </SignInButton>
            }
          />
          <section className="bg-dark-background p-5 shadow-sm">
            <p className="mt-3 text-sm text-primary-text">
              This scanner only works for users with organisation permissions that include scanning or wildcard access.
            </p>
          </section>
        </>
      </SignedOut>

      <SignedIn>
        <ScannerWorkspace />
      </SignedIn>
    </main>
  );
}
