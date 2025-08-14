'use client';
import { BundleTypeExtended } from "@dance-engine/schemas/bundle";
import BundleCard from "./BundleCard";
import ItemCard from "./ItemCard";
import { PassSelectorProvider } from "@/contexts/PassSelectorContext";

import { EventModelType } from "@dance-engine/schemas/events";


const PassPicker = ({ event, org, theme }: { event: EventModelType, org: string, theme?: string }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
      <PassSelectorProvider>
        {event.bundles && event.bundles.map((bundle: BundleTypeExtended) => (
          <BundleCard key={bundle.ksuid} bundleData={bundle} event={event} />
        ))}
        <pre className="col-span-full">{JSON.stringify(event,null,2)}</pre>
      </PassSelectorProvider>
    </div>
  );
};

export default PassPicker