'use client'

import type { ReactNode } from "react";
import Link from "next/link";
import useClerkSWR, { CorsError } from "@dance-engine/utils/clerkSWR";
import { useOrgContext } from "@dance-engine/utils/OrgContext";
import Spinner from "@dance-engine/ui/general/Spinner";
import { IoArrowBack, IoCloudOffline } from "react-icons/io5";
import { CustomerType } from "@dance-engine/schemas/customer";
import { TicketTypeExtended } from "@dance-engine/schemas/ticket";
import EntityDetailsCard from "../../components/EntityDetailsCard";

interface CustomerDetailClientProps {
  email: string;
}

const preferredFieldOrder = [
  "email",
  "name",
  "ksuid",
  "entity_type",
  "tickets",
] as const;

const isPlainObject = (value: unknown): value is Record<string, unknown> => (
  typeof value === "object" && value !== null && !Array.isArray(value)
);

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

const getTicketRef = (value: unknown): TicketTypeExtended | null => {
  if (!isPlainObject(value)) {
    return null;
  }

  const ksuid = typeof value.ksuid === "string" ? value.ksuid.trim() : "";
  const parentEventKsuid = typeof value.parent_event_ksuid === "string" ? value.parent_event_ksuid.trim() : "";

  if (!ksuid || !parentEventKsuid) {
    return null;
  }

  return value as TicketTypeExtended;
};

const PageCustomerDetailClient = ({ email }: CustomerDetailClientProps) => {
  const { activeOrg } = useOrgContext();
  const customerUrl = `${process.env.NEXT_PUBLIC_DANCE_ENGINE_API}/{org}/customers/${email}`;

  const { data, error, isLoading } = useClerkSWR(
    activeOrg ? customerUrl.replace('/{org}', `/${activeOrg}`) : null,
    { suspense: false },
  );

  const customerCandidates = Array.isArray(data?.customers)
    ? data.customers
    : data?.customers && typeof data.customers === "object"
      ? Object.values(data.customers)
      : data?.customer
        ? [data.customer]
        : data?.email
          ? [data]
          : [];

  const customer = customerCandidates[0] as CustomerType | undefined;
  const customerRecord = (customer ?? {}) as Record<string, unknown>;
  const hiddenFieldKeys = new Set(["version"]);
  const orderedFieldKeys = [
    ...preferredFieldOrder.filter((key) => key in customerRecord && !hiddenFieldKeys.has(key)),
    ...Object.keys(customerRecord).filter(
      (key) => !hiddenFieldKeys.has(key) && !preferredFieldOrder.includes(key as typeof preferredFieldOrder[number]),
    ),
  ];

  const renderFieldValue = (key: string, value: unknown): ReactNode => {
    if (key === "tickets" && Array.isArray(value)) {
      const tickets = value
        .map((item) => getTicketRef(item))
        .filter((item): item is TicketTypeExtended => Boolean(item));

      if (tickets.length > 0) {
        return (
          <div className="flex flex-col gap-2">
            {tickets.map((ticket) => {
              const ticketLabel = [ticket.name_on_ticket, ticket.name].filter(Boolean).join(" - ");

              return (
                <Link
                  key={ticket.ksuid}
                  href={`/events/${ticket.parent_event_ksuid}/tickets/${ticket.ksuid}`}
                  className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 hover:border-keppel-on-light hover:bg-gray-50"
                >
                  <div className="font-medium">{ticketLabel || ticket.ksuid}</div>
                  <div className="text-xs text-gray-600">
                    {ticket.ticket_status ? `Status: ${ticket.ticket_status}` : "View ticket"}
                  </div>
                </Link>
              );
            })}
          </div>
        );
      }
    }

    return formatValue(value);
  };

  if (!activeOrg) {
    return <div className="px-4 py-4 text-gray-600">No active organization selected</div>;
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-4 py-4 bg-pear-on-light text-gray-900 font-semibold w-full">
        <Spinner className="w-5 h-5" /> Loading customer...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 px-4 py-4 bg-red-800 text-white w-full">
        <IoCloudOffline className="w-6 h-6" />
        {error instanceof CorsError ? "Failed to load customer (CORS error)" : "Failed to load customer"}
      </div>
    );
  }

  if (!customer) {
    return <div className="px-4 py-4 text-gray-600">Customer not found</div>;
  }

  return (
    <div className="w-full px-4 lg:px-8 py-4 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Link
            href={`/customers`}
            className="inline-flex items-center gap-2 text-sm font-medium text-dark-highlight hover:underline"
          >
            <IoArrowBack className="h-4 w-4" /> Back to customers
          </Link>
          <h1 className="mt-3 text-2xl font-bold text-gray-900">{customer.name || customer.email || "Customer"}</h1>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_340px]">
        <EntityDetailsCard
          title="Customer information"
          description="Showing all fields currently returned by the API for this customer."
          record={customerRecord}
          fieldKeys={orderedFieldKeys}
          formatLabel={formatLabel}
          renderValue={renderFieldValue}
        />

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm flex flex-col items-center justify-center">
          <h2 className="text-lg font-semibold text-gray-900">QR code</h2>
          <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4">
            <div className="h-[220px] w-[220px] flex items-center justify-center text-sm text-gray-500">
            No QR token
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PageCustomerDetailClient;
