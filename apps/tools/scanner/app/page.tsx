"use client";

import { SignInButton, SignedIn, SignedOut, useUser } from "@clerk/nextjs";
import { useEffect, useMemo, useState } from "react";
import ScannerHeader from "./components/ScannerHeader";
import SelectionList from "./components/SelectionList";
import TopActionBar from "./components/TopActionBar";

export const dynamic = "force-dynamic";

const hasClerkKey = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

type OrgPermissions = Record<string, string[]>;

type ScannerEvent = {
  id: string;
  name: string;
  startsAt: string;
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

const asMessage = (value: unknown, fallback: string): string => {
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }
  return fallback;
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
  const [events, setEvents] = useState<ScannerEvent[]>([]);
  const [qrInput, setQrInput] = useState<string>("");
  const [ticket, setTicket] = useState<TicketRecord | null>(null);
  const [notice, setNotice] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loadingEvents, setLoadingEvents] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

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
      .sort((a, b) => a.localeCompare(b));
  }, [orgPermissions]);

  const hasGlobalScanning = useMemo(
    () => includesScanningPermission(orgPermissions["*"]),
    [orgPermissions],
  );

  const canScan = hasGlobalScanning || allowedOrgs.length > 0;

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

  useEffect(() => {
    const fetchEvents = async () => {
      if (!selectedOrg) {
        setEvents([]);
        setSelectedEvent("");
        return;
      }

      setEvents([]);
      setSelectedEvent("");
      setLoadingEvents(true);
      setError("");
      const result = await requestJson<{ events?: ScannerEvent[]; msg?: string }>(
        `/api/mock/scanner/events?orgId=${encodeURIComponent(selectedOrg)}`,
      );
      setLoadingEvents(false);

      if (!result.ok || !result.data || !Array.isArray(result.data.events)) {
        setEvents([]);
        setSelectedEvent("");
        setError(result.message);
        return;
      }

      const fetchedEvents = result.data.events;
      setEvents(fetchedEvents);
    };

    fetchEvents();
  }, [selectedOrg]);

  const runTicketAction = async (action: "check" | "mark-used" | "reset-unused") => {
    if (!selectedOrg || !selectedEvent) {
      setError("Choose an organisation and an event first.");
      return;
    }

    if (!qrInput.trim()) {
      setError("Scan or enter a QR code first.");
      return;
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
        qrCode: qrInput.trim(),
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

  const selectedEventDetails = useMemo(
    () => events.find((event) => event.id === selectedEvent) ?? null,
    [events, selectedEvent],
  );

  const orgItems = useMemo(() => {
    const items = allowedOrgs.map((org) => ({ id: org, label: org }));
    if (hasGlobalScanning) {
      return [{ id: "*", label: "All Organisations (*)" }, ...items];
    }
    return items;
  }, [allowedOrgs, hasGlobalScanning]);

  const eventItems = useMemo(
    () =>
      events.map((event) => ({
        id: event.id,
        label: event.name,
        description: new Date(event.startsAt).toLocaleString(),
      })),
    [events],
  );

  if (!isLoaded) {
    return <p className="text-base text-slate-600">Loading your scanner workspace...</p>;
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
    <div className="grid gap-3">
      <ScannerHeader
        selectedOrg={selectedOrg}
        selectedEventName={selectedEventDetails?.name ?? null}
      />
      <div className="main-space px-3">
      {viewMode === "orgs" ? (
        <SelectionList
          title="Choose Organisation"
          items={orgItems}
          onSelect={(orgId) => {
            setSelectedOrg(orgId);
            setSelectedEvent("");
            setQrInput("");
            setTicket(null);
            setNotice("");
            setError("");
            setViewMode("events");
          }}
        />
      ) : null}

      {viewMode === "events" ? (
        <SelectionList
          title="Choose Event"
          subtitle={selectedOrg === "*" ? "All organisations" : selectedOrg}
          onBack={() => {
            setSelectedOrg("");
            setSelectedEvent("");
            setQrInput("");
            setTicket(null);
            setNotice("");
            setError("");
            setViewMode("orgs");
          }}
          items={eventItems}
          loading={loadingEvents}
          emptyLabel="No events found"
          emptyState={
            <div className="py-6 text-center">
              <p className="text-xl font-semibold text-primary-text-highlight">No events found</p>
              <p className="mt-1 text-xs text-slate-300">
                There are no scannable events for this organisation yet.
              </p>
            </div>
          }
          onSelect={(eventId) => {
            setSelectedEvent(eventId);
            setQrInput("");
            setTicket(null);
            setNotice("");
            setError("");
            setViewMode("scanner");
          }}
        />
      ) : null}

      {viewMode === "scanner" ? (
        <>
          <section className="rounded-2xl border border-dark-outline bg-dark-background p-4 text-primary-text shadow-lg">
            <TopActionBar
              title="Scanner"
              onBack={() => {
                setSelectedEvent("");
                setQrInput("");
                setTicket(null);
                setNotice("");
                setError("");
                setViewMode("events");
              }}
              action={
                <button
                  type="button"
                  onClick={() => {
                    setQrInput(`TKT-${Math.floor(Math.random() * 9000 + 1000)}`);
                    setNotice("Demo QR captured.");
                    setError("");
                  }}
                  className="rounded-lg border border-keppel-logo px-2.5 py-1.5 text-xs font-semibold text-keppel-logo hover:bg-keppel-logo hover:text-white"
                >
                  Simulate
                </button>
              }
            />

            <label className="mt-3 grid gap-2 text-sm">
              QR Payload
              <input
                value={qrInput}
                onChange={(event) => setQrInput(event.target.value)}
                placeholder="Example: TKT-4821"
                className="rounded-xl border border-dark-outline bg-uberdark-background px-3 py-2 text-primary-text placeholder:text-slate-400"
              />
            </label>

            <div className="mt-3 grid grid-cols-2 gap-2">
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
              <h2 className="text-base font-semibold text-dark-background">Ticket Result</h2>
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
