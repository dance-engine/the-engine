'use client'

import { useState, type ReactNode } from "react";
import Link from "next/link";
import useClerkSWR, { CorsError } from "@dance-engine/utils/clerkSWR";
import { useOrgContext } from "@dance-engine/utils/OrgContext";
import Spinner from "@dance-engine/ui/general/Spinner";
import Badge from "@dance-engine/ui/Badge";
import QRCode from "react-qr-code";
import { IoArrowBack, IoCloudOffline } from "react-icons/io5";
import { TicketTypeExtended } from "@dance-engine/schemas/ticket";
import EntityDetailsCard from "../../../../components/EntityDetailsCard";
import RelatedEntityOverlay from "../../../../components/RelatedEntityOverlay";

interface TicketDetailClientProps {
  ksuid: string;
  ticketKsuid: string;
}

type RelatedEntityType = "BUNDLE" | "ITEM";

interface RelatedEntityRef {
  type: RelatedEntityType;
  ksuid: string;
  label?: string;
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

const bundleFieldOrder = [
  "ksuid",
  "entity_type",
  "name",
  "description",
  "status",
  "primary_price",
  "primary_price_name",
  "secondary_price",
  "secondary_price_name",
  "tertiary_price",
  "tertiary_price_name",
  "includes",
  "parent_event_ksuid",
  "event_slug",
  "version",
  "created_at",
  "updated_at",
] as const;

const itemFieldOrder = [
  "ksuid",
  "entity_type",
  "name",
  "description",
  "status",
  "primary_price",
  "primary_price_name",
  "stripe_price_id",
  "parent_event_ksuid",
  "event_slug",
  "version",
  "created_at",
  "updated_at",
] as const;

const isPlainObject = (value: unknown): value is Record<string, unknown> => (
  typeof value === "object" && value !== null && !Array.isArray(value)
);

const getEntityRef = (value: unknown): RelatedEntityRef | null => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    const [prefix, ...rest] = trimmed.split("#");
    const entityType = (prefix ?? "").toUpperCase();
    const ksuid = rest.join("#").trim();

    if ((entityType === "BUNDLE" || entityType === "ITEM") && ksuid) {
      return { type: entityType as RelatedEntityType, ksuid };
    }

    return null;
  }

  if (isPlainObject(value)) {
    const rawType = value.entity_type ?? value.child_type;
    const rawKsuid = value.ksuid ?? value.child_ksuid;
    const entityType = typeof rawType === "string" ? rawType.toUpperCase().trim() : "";
    const ksuid = typeof rawKsuid === "string" ? rawKsuid.trim() : "";

    if ((entityType === "BUNDLE" || entityType === "ITEM") && ksuid) {
      const label = typeof value.name === "string" && value.name.trim()
        ? `${value.name} (${ksuid})`
        : ksuid;

      return { type: entityType as RelatedEntityType, ksuid, label };
    }
  }

  return null;
};

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

const PageTicketDetailClient = ({ ksuid, ticketKsuid }: TicketDetailClientProps) => {
  const { activeOrg } = useOrgContext();
  const [selectedEntity, setSelectedEntity] = useState<RelatedEntityRef | null>(null);
  const ticketUrl = `${process.env.NEXT_PUBLIC_DANCE_ENGINE_API}/{org}/${ksuid}/tickets/${ticketKsuid}`;
  const bundleUrl = selectedEntity?.type === "BUNDLE" && activeOrg
    ? `${process.env.NEXT_PUBLIC_DANCE_ENGINE_API}/${activeOrg}/${ksuid}/bundles/${selectedEntity.ksuid}`
    : null;
  const itemUrl = selectedEntity?.type === "ITEM" && activeOrg
    ? `${process.env.NEXT_PUBLIC_DANCE_ENGINE_API}/${activeOrg}/${ksuid}/items/${selectedEntity.ksuid}`
    : null;

  const { data, error, isLoading } = useClerkSWR(
    activeOrg ? ticketUrl.replace('/{org}', `/${activeOrg}`) : null,
    { suspense: false },
  );

  const {
    data: bundleData,
    error: bundleError,
    isLoading: isBundleLoading,
  } = useClerkSWR(bundleUrl, { suspense: false });

  const {
    data: itemData,
    error: itemError,
    isLoading: isItemLoading,
  } = useClerkSWR(itemUrl, { suspense: false });

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

  const bundleCandidates = Array.isArray(bundleData?.bundles)
    ? bundleData.bundles
    : bundleData?.bundle
      ? [bundleData.bundle]
      : bundleData?.ksuid
        ? [bundleData]
        : [];

  const itemCandidates = Array.isArray(itemData?.items)
    ? itemData.items
    : itemData?.item
      ? [itemData.item]
      : itemData?.ksuid
        ? [itemData]
        : [];

  const selectedBundle = bundleCandidates[0] as Record<string, unknown> | undefined;
  const selectedItem = itemCandidates[0] as Record<string, unknown> | undefined;
  const overlayRecord = selectedEntity?.type === "BUNDLE" ? selectedBundle : selectedItem;
  const overlayTitle = selectedEntity?.type === "ITEM" ? "Item details" : "Bundle details";
  const overlayFieldOrder: readonly string[] = selectedEntity?.type === "ITEM" ? itemFieldOrder : bundleFieldOrder;
  const overlayFieldKeys = overlayRecord
    ? [
        ...overlayFieldOrder.filter((key) => key in overlayRecord),
        ...Object.keys(overlayRecord).filter(
          (key) => !overlayFieldOrder.includes(key as typeof overlayFieldOrder[number]),
        ),
      ]
    : [];

  const openEntity = (type: RelatedEntityType, ksuid: string, label?: string) => {
    if (ksuid.trim()) {
      setSelectedEntity({ type, ksuid: ksuid.trim(), ...(label ? { label } : {}) });
    }
  };

  const renderEntityButton = (entity: RelatedEntityRef) => (
    <button
      type="button"
      onClick={() => openEntity(entity.type, entity.ksuid, entity.label)}
      className="inline-flex items-center rounded-md bg-keppel-on-light px-2 py-1 text-xs text-white font-semibold hover:opacity-90"
    >
      {entity.label || entity.ksuid}
    </button>
  );

  const renderFieldValue = (key: string, value: unknown): ReactNode => {
    const lowerKey = key.toLowerCase();

    if (typeof value === "string") {
      const entityRef = getEntityRef(value);
      if (entityRef && (lowerKey.includes("bundle") || lowerKey.includes("item") || value.includes("#"))) {
        return renderEntityButton(entityRef);
      }
      return formatValue(value);
    }

    if (Array.isArray(value)) {
      const entityRefs = value
        .map((item) => getEntityRef(item))
        .filter((item): item is RelatedEntityRef => Boolean(item));

      if (entityRefs.length > 0) {
        return (
          <div className="flex flex-col gap-2">
            {entityRefs.map((entity) => (
              <div key={`${entity.type}-${entity.ksuid}`} className="flex flex-wrap items-center gap-2">
                {renderEntityButton(entity)}
              </div>
            ))}
          </div>
        );
      }

      return formatValue(value);
    }

    if (isPlainObject(value)) {
      const entityRef = getEntityRef(value);
      if (entityRef && (lowerKey.includes("bundle") || lowerKey.includes("item") || Boolean(entityRef.type))) {
        return renderEntityButton(entityRef);
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
        <EntityDetailsCard
          title="Ticket information"
          description="Showing all fields currently returned by the API for this ticket."
          record={ticketRecord}
          fieldKeys={orderedFieldKeys}
          formatLabel={formatLabel}
          renderValue={renderFieldValue}
        />

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

      <RelatedEntityOverlay
        open={Boolean(selectedEntity)}
        title={overlayTitle}
        subtitle={selectedEntity?.label || selectedEntity?.ksuid}
        isLoading={(selectedEntity?.type === "BUNDLE" && isBundleLoading) || (selectedEntity?.type === "ITEM" && isItemLoading)}
        hasError={Boolean((selectedEntity?.type === "BUNDLE" && bundleError) || (selectedEntity?.type === "ITEM" && itemError))}
        emptyMessage="Related item not found."
        record={overlayRecord}
        fieldKeys={overlayFieldKeys}
        onClose={() => setSelectedEntity(null)}
        formatLabel={formatLabel}
        renderValue={(_key, value) => formatValue(value)}
      />
    </div>
  );
};

export default PageTicketDetailClient;
