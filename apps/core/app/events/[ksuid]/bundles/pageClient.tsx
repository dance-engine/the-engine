'use client'
import { useCallback, useEffect, useState } from "react";
import useClerkSWR from "@dance-engine/utils/clerkSWR";
import { useOrgContext } from "@dance-engine/utils/OrgContext";
import { useAuth } from '@clerk/nextjs'
import Spinner from "@dance-engine/ui/general/Spinner";
import { IoCloudOffline } from "react-icons/io5";
import { CorsError } from "@dance-engine/utils/clerkSWR";
import { BundleTypeExtended, ItemType } from "@dance-engine/schemas/bundle";
import dynamic from "next/dynamic";
import { useLayoutSearch } from "../../../components/LayoutSearchContext";

const BasicList = dynamic(() => import('@dance-engine/ui/list/BasicList'), {
  ssr: false,
});

interface BundlesClientProps {
  ksuid: string;
}

const PageBundlesClient = ({ ksuid }: BundlesClientProps) => {
  const { activeOrg } = useOrgContext();
  const { getToken } = useAuth()
  const { debouncedQuery, setRawQuery } = useLayoutSearch();
  const baseUrl = `${process.env.NEXT_PUBLIC_DANCE_ENGINE_API}/{org}/events/${ksuid}`;
  const eventUrl = baseUrl.replace('/{org}', activeOrg ? `/${activeOrg}` : '');

  const { data: eventData, error, isLoading, mutate } = useClerkSWR(
    activeOrg ? eventUrl : null,
    { suspense: false }
  );

  const [bundles, setBundles] = useState<BundleTypeExtended[]>([]);
  const [items, setItems] = useState<ItemType[]>([]);
  const [pendingActionByRecord, setPendingActionByRecord] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (eventData?.event) {
      const { bundles: eventBundles = [], items: eventItems = [] } = eventData.event;
      setBundles(Array.isArray(eventBundles) ? eventBundles : Object.values(eventBundles || {}));
      setItems(Array.isArray(eventItems) ? eventItems : Object.values(eventItems || {}));
    }
  }, [eventData]);

  const toggleLiveState = useCallback(
    async (entityType: 'items' | 'bundles', record: Record<string, unknown>) => {
      if (!activeOrg) return

      const recordKsuid = String(record?.ksuid || '')
      if (!recordKsuid) return

      const status = String(record?.status || 'draft').toLowerCase()
      const isLive = status === 'live'
      const isItem = entityType === 'items'

      if (isItem && isLive) {
        console.warn('Items currently support publish only from draft to live.')
        return
      }

      const apiBaseUrl = process.env.NEXT_PUBLIC_DANCE_ENGINE_API ?? ''
      const endpointBase = `${apiBaseUrl}/${activeOrg}/${ksuid}/${entityType}`
      const requestUrl = isLive ? endpointBase : `${endpointBase}/publish`
      const requestMethod = isLive ? 'PUT' : 'POST'
      const requestBody = isLive
        ? { [entityType]: [{ ...record, status: 'draft' }] }
        : { [entityType]: [recordKsuid] }

      setPendingActionByRecord((previous) => ({ ...previous, [recordKsuid]: true }))

      try {
        const response = await fetch(requestUrl, {
          method: requestMethod,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${await getToken()}`,
          },
          body: JSON.stringify(requestBody),
        })

        if (!response.ok) {
          throw new Error(`Status toggle failed with status ${response.status}`)
        }

        await mutate()
      } catch (toggleError) {
        console.error(toggleError)
      } finally {
        setPendingActionByRecord((previous) => ({ ...previous, [recordKsuid]: false }))
      }
    },
    [activeOrg, getToken, ksuid, mutate]
  )

  const renderBundleRowActions = useCallback(
    (record: Record<string, unknown>) => {
      const recordKsuid = String(record?.ksuid || '')
      if (!recordKsuid) return null

      const status = String(record?.status || 'draft').toLowerCase()
      const isLive = status === 'live'
      const isPending = Boolean(pendingActionByRecord[recordKsuid])

      return (
        <button
          type="button"
          className="text-white flex items-center justify-center gap-1 bg-dark-background px-1.5 py-1.5 rounded z-0 disabled:opacity-60"
          onClick={() => toggleLiveState('bundles', record)}
          disabled={isPending}
        >
          <span className="text-xs font-medium leading-none">{isPending ? 'Saving...' : isLive ? 'Set Draft' : 'Set Live'}</span>
        </button>
      )
    },
    [pendingActionByRecord, toggleLiveState]
  )

  const renderItemRowActions = useCallback(
    (record: Record<string, unknown>) => {
      const recordKsuid = String(record?.ksuid || '')
      if (!recordKsuid) return null

      const status = String(record?.status || 'draft').toLowerCase()
      const isLive = status === 'live'
      const isPending = Boolean(pendingActionByRecord[recordKsuid])
      const disabled = isPending || isLive

      return (
        <button
          type="button"
          className="text-white flex items-center justify-center gap-1 bg-dark-background px-1.5 py-1.5 rounded z-0 disabled:opacity-60"
          onClick={() => toggleLiveState('items', record)}
          disabled={disabled}
          title={isLive ? 'Items currently support publish from draft to live only.' : undefined}
        >
          <span className="text-xs font-medium leading-none">{isPending ? 'Saving...' : isLive ? 'Live' : 'Set Live'}</span>
        </button>
      )
    },
    [pendingActionByRecord, toggleLiveState]
  )

  if (!activeOrg) {
    return <div className="px-4 py-4 text-gray-600">No active organization selected</div>;
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-4 py-4 bg-pear-on-light text-gray-900 font-semibold w-full">
        <Spinner className="w-5 h-5" /> Loading event...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 px-4 py-4 bg-red-800 text-white w-full">
        <IoCloudOffline className="w-6 h-6" />
        {error instanceof CorsError ? "Failed to load event (CORS error)" : "Failed to load event"}
      </div>
    );
  }

  return (
    <div className="w-full space-y-8">
      {/* Bundles Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 px-4 lg:px-8">Bundles ({bundles.length})</h2>
        <BasicList 
          entity="BUNDLE"
          columns={["name", "status", "primary_price", "primary_price_name","ksuid"]}
          formats={[undefined, undefined, "currency", undefined, undefined]}
          records={bundles as Record<string, unknown>[]}
          activeOrg={activeOrg || ''}
          parentKsuid={ksuid}
          parentEntityName="event"
          searchQuery={debouncedQuery}
          onClearSearch={() => setRawQuery('')}
          rowActions={renderBundleRowActions}
        />
      </div>

      {/* Items Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 px-4 lg:px-8">Items ({items.length})</h2>
        <BasicList 
          entity="ITEM"
          columns={["name", "status", "primary_price", "primary_price_name"]}
          formats={[undefined, undefined, "currency", undefined]}
          records={items as Record<string, unknown>[]}
          activeOrg={activeOrg || ''}
          parentKsuid={ksuid}
          parentEntityName="event"
          searchQuery={debouncedQuery}
          onClearSearch={() => setRawQuery('')}
          rowActions={renderItemRowActions}
        />
      </div>
    </div>
  );
};

export default PageBundlesClient;
