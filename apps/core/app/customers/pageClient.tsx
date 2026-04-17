'use client'

import dynamic from "next/dynamic";
import { useCallback, useMemo } from "react";
import { IoEyeOutline, IoCloudOffline } from "react-icons/io5";
import useClerkSWR, { CorsError } from "@dance-engine/utils/clerkSWR";
import { useOrgContext } from "@dance-engine/utils/OrgContext";
import { validateEntity, EntityType } from "@dance-engine/schemas";
import { CustomerType } from "@dance-engine/schemas/customer";
import Spinner from "@dance-engine/ui/general/Spinner";
import ActionIconButton from "@dance-engine/ui/actions/ActionIconButton";
import ActionRow from "@dance-engine/ui/actions/ActionRow";
import { useLayoutSearch } from "../components/LayoutSearchContext";

const BasicList = dynamic(() => import('@dance-engine/ui/list/BasicList'), {
  ssr: false,
});

const PageCustomersClient = () => {
  const { activeOrg } = useOrgContext();
  const { debouncedQuery, setRawQuery } = useLayoutSearch();
  const customersApiUrl = `${process.env.NEXT_PUBLIC_DANCE_ENGINE_API}/{org}/customers`;

  const { data: remoteCustomerData = [], error, isLoading } = useClerkSWR(
    activeOrg ? customersApiUrl.replace('/{org}', `/${activeOrg}`) : null,
    { suspense: false },
  );

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
          rowActions={(record) => (
            <ActionRow>
              <ActionIconButton
                href={`/customers/${encodeURIComponent(String(record.email || ''))}`}
                label="View customer"
                icon={<IoEyeOutline className="h-5 w-5" />}
              />
            </ActionRow>
          )}
        />
      </div>
    </div>
  );
};

export default PageCustomersClient;
