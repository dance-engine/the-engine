'use client'

import { useState, type ReactNode } from "react";
import Link from "next/link";
import useClerkSWR, { CorsError } from "@dance-engine/utils/clerkSWR";
import { useOrgContext } from "@dance-engine/utils/OrgContext";
import Spinner from "@dance-engine/ui/general/Spinner";
import Badge from "@dance-engine/ui/Badge";
import QRCode from "react-qr-code";
import { IoArrowBack, IoCloudOffline } from "react-icons/io5";
import { CustomerType } from "@dance-engine/schemas/customer";
import EntityDetailsCard from "../../components/EntityDetailsCard";
import RelatedEntityOverlay from "../../components/RelatedEntityOverlay";

interface CustomerDetailClientProps {
  email: string;
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
  "email",
  "tickets",
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

const PageCustomerDetailClient = ({ email }: CustomerDetailClientProps) => {
  const { activeOrg } = useOrgContext();
  const [selectedEntity, setSelectedEntity] = useState<RelatedEntityRef | null>(null);
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
  const hiddenFieldKeys = new Set(["qr_token"]);
  const orderedFieldKeys = [
    ...preferredFieldOrder.filter((key) => key in customerRecord && !hiddenFieldKeys.has(key)),
    ...Object.keys(customerRecord).filter(
      (key) => !hiddenFieldKeys.has(key) && !preferredFieldOrder.includes(key as typeof preferredFieldOrder[number]),
    ),
  ];

    //   To be removed
  const selectedBundle = undefined as Record<string, unknown> | undefined;
  const selectedItem = undefined as Record<string, unknown> | undefined;
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
    //   To be removed
  const openEntity = (type: RelatedEntityType, ksuid: string, label?: string) => {
    if (ksuid.trim()) {
      setSelectedEntity({ type, ksuid: ksuid.trim(), ...(label ? { label } : {}) });
    }
  };
    //   To be removed
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
{/* 
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
      /> */}
    </div>
  );
};

export default PageCustomerDetailClient;
