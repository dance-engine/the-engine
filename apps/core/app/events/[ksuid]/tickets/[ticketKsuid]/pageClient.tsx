'use client'

import type { ReactNode } from "react";
import Link from "next/link";
import useClerkSWR, { CorsError } from "@dance-engine/utils/clerkSWR";
import { useOrgContext } from "@dance-engine/utils/OrgContext";
import Spinner from "@dance-engine/ui/general/Spinner";
import Badge from "@dance-engine/ui/Badge";
import QRCode from "react-qr-code";
import { IoArrowBack, IoCloudOffline } from "react-icons/io5";
import { TicketTypeExtended } from "@dance-engine/schemas/ticket";

interface TicketDetailClientProps {
  ksuid: string;
  ticketKsuid: string;
}

const preferredFieldOrder = [
  "ksuid",
  "entity_type",
  "name",
  "name_on_ticket",
  "customer_email",
  "parent_event_ksuid",
  "event_slug",
  "ticket_status",
  "financial_status",
  "admission_status",
  "check_in_count",
  "checked_in_by",
  "checked_in_at",
  "created_at",
  "updated_at",
  "includes",
  "expanded_includes",
  "version",
  "meta",
] as const;

const formatLabel = (key: string) =>
  key
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const formatValue = (value: unknown): ReactNode => {
  if (value === null || value === undefined) {
    return "-";
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || "-";
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return "-";
    }

    const primitiveValues = value.every(
      (item) => ["string", "number", "boolean"].includes(typeof item),
    );

    return primitiveValues ? value.join(", ") : (
      <pre className="rounded bg-gray-50 p-2 text-xs text-gray-700 whitespace-pre-wrap break-words">
        {JSON.stringify(value, null, 2)}
      </pre>
    );
  }

  return (
    <pre className="rounded bg-gray-50 p-2 text-xs text-gray-700 whitespace-pre-wrap break-words">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
};

const FieldRow = ({ label, value }: { label: string; value?: ReactNode }) => (
  <div className="border-b border-gray-200 py-3">
    <dt className="text-sm font-medium text-gray-500">{label}</dt>
    <dd className="mt-1 text-sm text-gray-900 break-all whitespace-pre-wrap">{value || "-"}</dd>
  </div>
);

const PageTicketDetailClient = ({ ksuid, ticketKsuid }: TicketDetailClientProps) => {
  const { activeOrg } = useOrgContext();
  const ticketUrl = `${process.env.NEXT_PUBLIC_DANCE_ENGINE_API}/{org}/${ksuid}/tickets/${ticketKsuid}`;

  const { data, error, isLoading } = useClerkSWR(
    activeOrg ? ticketUrl.replace('/{org}', `/${activeOrg}`) : null,
    { suspense: false },
  );

  const ticketCandidates = Array.isArray(data?.tickets)
    ? data.tickets
    : data?.tickets && typeof data.tickets === "object"
      ? Object.values(data.tickets)
      : data?.ticket
        ? [data.ticket]
        : data?.ksuid
          ? [data]
          : [];

  const ticket = ticketCandidates[0] as TicketTypeExtended | undefined;
  const ticketRecord = (ticket ?? {}) as Record<string, unknown>;
  const hiddenFieldKeys = new Set(["qr_token"]);
  const orderedFieldKeys = [
    ...preferredFieldOrder.filter((key) => key in ticketRecord && !hiddenFieldKeys.has(key)),
    ...Object.keys(ticketRecord).filter(
      (key) => !hiddenFieldKeys.has(key) && !preferredFieldOrder.includes(key as typeof preferredFieldOrder[number]),
    ),
  ];

  if (!activeOrg) {
    return <div className="px-4 py-4 text-gray-600">No active organization selected</div>;
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-4 py-4 bg-pear-on-light text-gray-900 font-semibold w-full">
        <Spinner className="w-5 h-5" /> Loading ticket...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 px-4 py-4 bg-red-800 text-white w-full">
        <IoCloudOffline className="w-6 h-6" />
        {error instanceof CorsError ? "Failed to load ticket (CORS error)" : "Failed to load ticket"}
      </div>
    );
  }

  if (!ticket) {
    return <div className="px-4 py-4 text-gray-600">Ticket not found</div>;
  }

  return (
    <div className="w-full px-4 lg:px-8 py-4 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Link
            href={`/events/${ksuid}/tickets`}
            className="inline-flex items-center gap-2 text-sm font-medium text-dark-highlight hover:underline"
          >
            <IoArrowBack className="h-4 w-4" /> Back to tickets
          </Link>
          <h1 className="mt-3 text-2xl font-bold text-gray-900">{ticket.name_on_ticket || ticket.name || "Ticket"}</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            {ticket.ticket_status ? <Badge>{ticket.ticket_status}</Badge> : null}
            {ticket.financial_status ? <Badge>{ticket.financial_status}</Badge> : null}
            {ticket.admission_status ? <Badge>{ticket.admission_status}</Badge> : null}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_340px]">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Ticket information</h2>
          <p className="mt-1 text-sm text-gray-500">Showing all fields currently returned by the API for this ticket.</p>
          <dl className="mt-4 grid gap-x-8 sm:grid-cols-2">
            {orderedFieldKeys.map((key) => (
              <FieldRow
                key={key}
                label={formatLabel(key)}
                value={formatValue(ticketRecord[key])}
              />
            ))}
          </dl>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm flex flex-col items-center justify-center">
          <h2 className="text-lg font-semibold text-gray-900">QR code</h2>
          <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4">
            {ticket.qr_token ? (
              <QRCode value={ticket.qr_token} size={220} />
            ) : (
              <div className="h-[220px] w-[220px] flex items-center justify-center text-sm text-gray-500">
                No QR token
              </div>
            )}
          </div>
          <p className="mt-4 text-xs text-center text-gray-500 break-all">{ticket.qr_token || "No QR token available"}</p>
        </div>
      </div>
    </div>
  );
};

export default PageTicketDetailClient;
