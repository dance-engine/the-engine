"use client";

import { SignInButton, SignedIn, SignedOut, useUser } from "@clerk/nextjs";
import useClerkSWR, { CorsError } from "@dance-engine/utils/clerkSWR";
import { useEffect, useMemo, useState } from "react";
import DataLoading from "./components/DataLoading";
import FullPageWarning from "./components/FullPageWarning";
import QrReader from "./components/QrReader";
import ScannerHeader from "./components/ScannerHeader";
import SelectionList from "./components/SelectionList";
import TopActionBar from "./components/TopActionBar";
import { createScannerNavigation } from "./lib/scannerNavigation";

export const dynamic = "force-dynamic";

const hasClerkKey = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
const apiBaseUrl = process.env.NEXT_PUBLIC_DANCE_ENGINE_API;
const organisationsApiUrl = apiBaseUrl ? `${apiBaseUrl}/public/organisations` : null;

type OrgPermissions = Record<string, string[]>;

type ScannerEvent = {
  id: string;
  name: string;
  startsAt: string | null;
  endsAt: string | null;
  status: string | null;
};

type EventsApiEvent = {
  ksuid?: string;
  name?: string;
  starts_at?: string | null;
  ends_at?: string | null;
  status?: string | null;
};

type PublicOrganisation = {
  organisation?: string;
  name?: string;
};

type TicketStatus = "used" | "unused";

type TicketRecord = {
  ticketId: string;
  attendeeName: string;
  status: TicketStatus;
  eventId: string;
  eventName: string;
  qrCode: string;
  scannedAt: string;
};

type ApiResult<T> = {
  ok: boolean;
  status: number;
  data: T | null;
  message: string;
};

type ApiErrorPayload = {
  msg?: unknown;
};

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

const requestJson = async <T,>(
  input: RequestInfo,
  init?: RequestInit,
): Promise<ApiResult<T>> => {
  try {
    const response = await fetch(input, init);
    const rawBody = await response.text();

    if (!rawBody) {
      if (!response.ok) {
        return {
          ok: false,
          status: response.status,
          data: null,
          message: `Request failed (${response.status}) with an empty body.`,
        };
      }
      return {
        ok: false,
        status: response.status,
        data: null,
        message: "Request succeeded but the response body was empty.",
      };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawBody);
    } catch {
      return {
        ok: false,
        status: response.status,
        data: null,
        message: "Response body was not valid JSON.",
      };
    }

    if (!response.ok) {
      const payload = parsed as ApiErrorPayload;
      return {
        ok: false,
        status: response.status,
        data: null,
        message: asMessage(payload.msg, `Request failed (${response.status}).`),
      };
    }

    return {
      ok: true,
      status: response.status,
      data: parsed as T,
      message: "OK",
    };
  } catch {
    return {
      ok: false,
      status: 0,
      data: null,
      message: "Network error while contacting scanner API.",
    };
  }
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
  ) => {
    if (!selectedOrg || !selectedEvent) {
      setError("Choose an organisation and an event first.");
      return;
    }

    const qrCode = (qrCodeOverride ?? qrInput).trim();
    if (!qrCode) {
      setError("Scan or enter a QR code first.");
      return;
    }

    if (qrCode !== qrInput) {
      setQrInput(qrCode);
    }

    if (action === "check") {
      setTicket(null);
    }

    setSubmitting(true);
    setError("");
    setNotice("");

    const endpoint =
      action === "check"
        ? "/api/mock/scanner/check"
        : action === "mark-used"
          ? "/api/mock/scanner/mark-used"
          : "/api/mock/scanner/reset-unused";

    const result = await requestJson<{ ticket?: TicketRecord; msg?: string }>(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgId: selectedOrg,
        eventId: selectedEvent,
        qrCode,
      }),
    });
    setSubmitting(false);

    if (!result.ok || !result.data || !result.data.ticket) {
      setError(result.message);
      return;
    }

    setTicket(result.data.ticket);
    setNotice(asMessage(result.data.msg, "Ticket updated."));
  };

  const handleQrDetected = async (value: string) => {
    setQrInput(value);
    setError("");
    setNotice("QR captured. Checking ticket...");
    await runTicketAction("check", value);
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
        <details className="mt-4 rounded-xl border border-red-200 bg-white/70 p-3">
          <summary className="cursor-pointer text-sm font-semibold">Debug permissions + orgs</summary>
          <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">
{JSON.stringify(
  {
    userId: user?.id ?? null,
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
            <section className="text-primary-text shadow-lg">
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

              <div className="grid grid-cols-2 gap-2 p-2">
                <button
                  type="button"
                  onClick={() => runTicketAction("check")}
                  disabled={submitting}
                  className="rounded-lg bg-keppel-logo px-3 py-2 text-sm font-semibold text-white hover:bg-keppel-on-light disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Check
                </button>
                <button
                  type="button"
                  onClick={() => runTicketAction("mark-used")}
                  disabled={submitting || !ticket}
                  className="rounded-lg bg-cerise-logo px-3 py-2 text-sm font-semibold text-white hover:bg-cerise-on-light disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Mark Used
                </button>
                <button
                  type="button"
                  onClick={() => runTicketAction("reset-unused")}
                  disabled={submitting || !ticket}
                  className="col-span-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Reset to Unused
                </button>
              </div>
            </section>

            {error ? (
              <p className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
            ) : null}
            {notice ? (
              <p className="rounded-xl border border-keppel-logo/40 bg-keppel-logo/10 px-4 py-3 text-sm text-keppel-on-light">
                {notice}
              </p>
            ) : null}

            {ticket ? (
              <section className="rounded-2xl border border-dark-outline bg-white/90 p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-base font-semibold text-dark-background">Ticket Result</h2>
                  <button
                    type="button"
                    onClick={() => {
                      setTicket(null);
                      setQrInput("");
                      setNotice("");
                      setError("");
                    }}
                    className="rounded-lg border border-dark-outline px-3 py-1.5 text-xs font-semibold text-dark-background hover:bg-slate-100"
                  >
                    Scan Next
                  </button>
                </div>
                <div className="mt-3 grid gap-2 text-sm text-slate-700">
                  <p>
                    <span className="font-semibold">Attendee:</span> {ticket.attendeeName}
                  </p>
                  <p>
                    <span className="font-semibold">Ticket:</span> {ticket.ticketId}
                  </p>
                  <p>
                    <span className="font-semibold">Event:</span> {ticket.eventName}
                  </p>
                  <p>
                    <span className="font-semibold">Scanned At:</span>{" "}
                    {new Date(ticket.scannedAt).toLocaleString()}
                  </p>
                  <p>
                    <span className="font-semibold">Status:</span>{" "}
                    <span
                      className={
                        ticket.status === "used"
                          ? "rounded-full bg-cerise-logo px-3 py-1 text-xs font-bold uppercase text-white"
                          : "rounded-full bg-keppel-logo px-3 py-1 text-xs font-bold uppercase text-white"
                      }
                    >
                      {ticket.status}
                    </span>
                  </p>
                </div>
              </section>
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
          <ScannerHeader selectedOrg="" selectedEventName={null} />
          <section className="bg-dark-background p-5 shadow-sm">
            <p className="mt-3 text-sm text-primary-text">
              This scanner only works for users with organisation permissions that include scanning or wildcard access.
            </p>
            <SignInButton>
              <button className="mt-4 rounded-lg bg-keppel-logo px-4 py-2 text-sm font-semibold text-white hover:bg-keppel-on-light">
                Sign In
              </button>
            </SignInButton>
          </section>
        </>
      </SignedOut>

      <SignedIn>
        <ScannerWorkspace />
      </SignedIn>
    </main>
  );
}
