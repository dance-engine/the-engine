'use client'
import { useEffect, useState } from "react";
import useClerkSWR from "@dance-engine/utils/clerkSWR";
import { useOrgContext } from "@dance-engine/utils/OrgContext";
import Spinner from "@dance-engine/ui/general/Spinner";
import { IoCloudOffline } from "react-icons/io5";
import { CorsError } from "@dance-engine/utils/clerkSWR";
import { BundleTypeExtended, ItemType } from "@dance-engine/schemas/bundle";
import dynamic from "next/dynamic";

const BasicList = dynamic(() => import('@dance-engine/ui/list/BasicList'), {
  ssr: false,
});

interface BundlesClientProps {
  ksuid: string;
}

const PageBundlesClient = ({ ksuid }: BundlesClientProps) => {
  const { activeOrg } = useOrgContext();
  const baseUrl = `${process.env.NEXT_PUBLIC_DANCE_ENGINE_API}/{org}/events/${ksuid}`;
  const eventUrl = baseUrl.replace('/{org}', activeOrg ? `/${activeOrg}` : '');

  const { data: eventData, error, isLoading } = useClerkSWR(
    activeOrg ? eventUrl : null,
    { suspense: false }
  );

  const [bundles, setBundles] = useState<BundleTypeExtended[]>([]);
  const [items, setItems] = useState<ItemType[]>([]);

  useEffect(() => {
    if (eventData?.event) {
      const { bundles: eventBundles = [], items: eventItems = [] } = eventData.event;
      setBundles(Array.isArray(eventBundles) ? eventBundles : Object.values(eventBundles || {}));
      setItems(Array.isArray(eventItems) ? eventItems : Object.values(eventItems || {}));
    }
  }, [eventData]);

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
          entity="BUNDLE" as any
          columns={["name", "primary_price", "primary_price_name","ksuid"]}
          formats={[undefined, "currency", undefined]}
          records={bundles}
          activeOrg={activeOrg || ''}
          parentKsuid={ksuid}
          parentEntityName="event"
        />
      </div>

      {/* Items Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 px-4 lg:px-8">Items ({items.length})</h2>
        <BasicList 
          entity="ITEM" as any
          columns={["name", "primary_price", "primary_price_name"]}
          formats={[undefined, "currency", undefined]}
          records={items}
          activeOrg={activeOrg || ''}
          parentKsuid={ksuid}
          parentEntityName="event"
        />
      </div>
    </div>
  );
};

export default PageBundlesClient;
