'use client'

import dynamic from "next/dynamic";
import { useCallback, useMemo, useState } from "react";
import { IoEyeOutline, IoCloudOffline } from "react-icons/io5";
import useClerkSWR, { CorsError } from "@dance-engine/utils/clerkSWR";
import { useOrgContext } from "@dance-engine/utils/OrgContext";
import { validateEntity, EntityType } from "@dance-engine/schemas";
import { CustomerType } from "@dance-engine/schemas/customer";
import { useAuth } from "@clerk/nextjs";
import Spinner from "@dance-engine/ui/general/Spinner";
import ActionIconButton from "@dance-engine/ui/actions/ActionIconButton";
import ActionRow from "@dance-engine/ui/actions/ActionRow";
import { useLayoutSearch } from "../components/LayoutSearchContext";

const BasicList = dynamic(() => import('@dance-engine/ui/list/BasicList'), {
  ssr: false,
});

const whatsappStatusOptions = ["unknown", "pending", "invited", "joined", "left"] as const;
type WhatsappGroupStatus = (typeof whatsappStatusOptions)[number];

const getCustomerStorageKey = (activeOrg: string, email: string) => `${activeOrg}:CUSTOMER#${email}`;

const PageCustomersClient = () => {
  const { activeOrg } = useOrgContext();
  const { getToken } = useAuth();
  const { debouncedQuery, setRawQuery } = useLayoutSearch();
  const customersApiUrl = `${process.env.NEXT_PUBLIC_DANCE_ENGINE_API}/{org}/customers`;

  const { data: remoteCustomerData = [], error, isLoading, mutate } = useClerkSWR(
    activeOrg ? customersApiUrl.replace('/{org}', `/${activeOrg}`) : null,
    { suspense: false },
  );
  const [pendingWhatsAppByRecord, setPendingWhatsAppByRecord] = useState<Record<string, boolean>>({});
  const [selectedWhatsAppStatusByRecord, setSelectedWhatsAppStatusByRecord] = useState<Record<string, WhatsappGroupStatus>>({});

  const getCustomers = useCallback(() => {
    if (!activeOrg || typeof window === "undefined") return [];

    const cached = window.localStorage.getItem(`${activeOrg}:CUSTOMER`);
    return cached
      ? JSON.parse(cached)
          ?.map((storageKey: string) => {
            const parsed = JSON.parse(window.localStorage.getItem(storageKey) || '{}');
            const result = validateEntity("CUSTOMER", parsed);

            return result.success
              ? { ...result.data, meta: { ...(result.data.meta ?? {}), valid: true } }
              : { ...(parsed ?? {}), meta: { ...(parsed?.meta ?? {}), valid: false } };
          })
          .filter(Boolean)
      : [];
  }, [activeOrg]);

  const localCustomers = useMemo(() => getCustomers(), [getCustomers]);

  const customers = useMemo(() => {
    const byId = new Map<string, EntityType>();
    const remoteCustomers = remoteCustomerData.customers || [];

    if (Array.isArray(remoteCustomers)) {
      remoteCustomers.forEach((record: EntityType) => {
        const customer = record as CustomerType;
        const id = String(customer.ksuid || customer.email || '');
        if (!id) return;

        byId.set(id, {
          ...customer,
          meta: { ...(customer.meta ?? {}), valid: true, source: `remote${id}`, saved: "saved" },
        });
      });
    }

    localCustomers.forEach((record: EntityType) => {
      const id = String(record.ksuid || (record as CustomerType).email || '');
      if (!id) return;

      const remoteCustomer = byId.get(id);
      if (!remoteCustomer) {
        byId.set(id, { ...record, meta: { ...(record.meta ?? {}), source: 'local (unsaved)' } });
        return;
      }

      if (remoteCustomer.version && record.version && remoteCustomer.version <= record.version) {
        byId.set(id, { ...record, meta: { ...(record.meta ?? {}), source: 'local (newer)' } });
        return;
      }

      byId.set(id, {
        ...remoteCustomer,
        meta: { ...(remoteCustomer.meta ?? {}), source: 'remote (newer)' },
      });
    });

    return Array.from(byId.values());
  }, [localCustomers, remoteCustomerData]);

  const updateWhatsAppStatus = useCallback(async (record: Record<string, unknown>) => {
    if (!activeOrg) return;

    const recordKey = String(record.ksuid || record.email || "");
    const customerKsuid = typeof record.ksuid === "string" ? record.ksuid : "";
    const customerEmail = typeof record.email === "string" ? record.email : "";
    if (!recordKey) return;
    if (!customerKsuid) {
      console.error("Cannot update WhatsApp status because customer ksuid is missing.");
      return;
    }

    const selectedStatus = selectedWhatsAppStatusByRecord[recordKey];
    const currentStatus = String(record.whatsapp_group_status || "unknown") as WhatsappGroupStatus;
    const nextStatus = selectedStatus || currentStatus;
    const parsedVersion = typeof record.version === "number"
      ? record.version
      : Number(record.version || 0);
    const currentVersion = Number.isFinite(parsedVersion) ? parsedVersion : 0;

    if (nextStatus === currentStatus) return;

    const customerPayload: Partial<CustomerType> = {
      entity_type: "CUSTOMER",
      ksuid: customerKsuid,
      name: typeof record.name === "string" ? record.name : "",
      email: customerEmail,
      phone: typeof record.phone === "string" ? record.phone : "",
      bio: typeof record.bio === "string" ? record.bio : "",
      whatsapp_group_status: nextStatus,
      version: Number.isFinite(currentVersion) ? currentVersion : 0,
    };

    if (!customerPayload.name || !customerPayload.email || !customerPayload.phone || !customerPayload.bio) {
      console.error("Cannot update WhatsApp status because required customer fields are missing.");
      return;
    }

    setPendingWhatsAppByRecord((previous) => ({ ...previous, [recordKey]: true }));

    try {
      const response = await fetch(`${customersApiUrl.replace('/{org}', `/${activeOrg}`)}/${encodeURIComponent(customerKsuid)}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await getToken()}`,
        },
        body: JSON.stringify({ customer: customerPayload }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update WhatsApp status (${response.status})`);
      }

      const responseData = await response.json().catch(() => ({}));
      const updatedCustomer = responseData?.customer || responseData?.event || customerPayload;
      const fallbackVersion = currentVersion;

      if (typeof window !== "undefined" && customerEmail) {
        const storageKey = getCustomerStorageKey(activeOrg, customerEmail);
        const previousCached = JSON.parse(window.localStorage.getItem(storageKey) || "{}");
        window.localStorage.setItem(
          storageKey,
          JSON.stringify({
            ...previousCached,
            ...record,
            ...updatedCustomer,
            whatsapp_group_status: nextStatus,
            version: typeof updatedCustomer?.version === "number" ? updatedCustomer.version : fallbackVersion + 1,
            meta: {
              ...(previousCached?.meta ?? {}),
              saved: "saved",
              updated_at: new Date().toISOString(),
            },
          })
        );
      }

      await mutate();
      setSelectedWhatsAppStatusByRecord((previous) => {
        const next = { ...previous };
        delete next[recordKey];
        return next;
      });
    } catch (updateError) {
      console.error(updateError);
    } finally {
      setPendingWhatsAppByRecord((previous) => ({ ...previous, [recordKey]: false }));
    }
  }, [activeOrg, customersApiUrl, getToken, mutate, selectedWhatsAppStatusByRecord]);

  if (!activeOrg) {
    return <div className="px-4 py-4 text-gray-600">No active organization selected</div>;
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-4 py-4 bg-pear-on-light text-gray-900 font-semibold w-full">
        <Spinner className="w-5 h-5" /> Loading customers...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 px-4 py-4 bg-red-800 text-white w-full">
        <IoCloudOffline className="w-6 h-6" />
        {error instanceof CorsError ? "Failed to load customers (CORS error)" : "Failed to load customers"}
      </div>
    );
  }

  return (
    <div className="w-full space-y-8">
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 px-4 lg:px-8">Customers ({customers.length})</h2>
        <BasicList
          entity="CUSTOMER"
          columns={["name", "meta.saved", "version", "email"]}
          formats={[undefined, "icon", undefined, undefined]}
          records={customers as Record<string, unknown>[]}
          activeOrg={activeOrg || ''}
          searchQuery={debouncedQuery}
          onClearSearch={() => setRawQuery('')}
          showEditAction={false}
          showDeleteAction={false}
          rowActions={(record) => {
            const recordKey = String(record.ksuid || record.email || "");
            const hasPhoneNumber = typeof record.phone === "string" && record.phone.trim().length > 0;
            const currentStatus = String(record.whatsapp_group_status || "unknown") as WhatsappGroupStatus;
            const selectedStatus = selectedWhatsAppStatusByRecord[recordKey] || currentStatus;
            const isPending = Boolean(pendingWhatsAppByRecord[recordKey]);
            const canSave = selectedStatus !== currentStatus && !isPending;

            return (
              <ActionRow>
                <ActionIconButton
                  href={`/customers/${encodeURIComponent(String(record.email || ''))}`}
                  label="View customer"
                  icon={<IoEyeOutline className="h-5 w-5" />}
                />

                {hasPhoneNumber ? (
                  <div className="flex items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50/60 px-2 py-1">
                    <select
                      aria-label="Change WhatsApp status"
                      className="h-8 min-w-[8.5rem] rounded-md border border-emerald-300 bg-white px-2.5 text-xs font-medium capitalize text-emerald-900 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                      value={selectedStatus}
                      onChange={(event) => {
                        const value = event.target.value as WhatsappGroupStatus;
                        setSelectedWhatsAppStatusByRecord((previous) => ({ ...previous, [recordKey]: value }));
                      }}
                      disabled={isPending}
                    >
                      {whatsappStatusOptions.map((statusOption) => (
                        <option key={statusOption} value={statusOption}>
                          {statusOption}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={() => updateWhatsAppStatus(record)}
                      disabled={!canSave}
                      className="h-8 rounded-md bg-emerald-700 px-3 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-600"
                    >
                      {isPending ? "Saving..." : "Update WhatsApp"}
                    </button>
                  </div>
                ) : null}
              </ActionRow>
            );
          }}
        />
      </div>
    </div>
  );
};

export default PageCustomersClient;
