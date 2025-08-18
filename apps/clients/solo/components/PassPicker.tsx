'use client';
import { BundleTypeExtended } from "@dance-engine/schemas/bundle";
import BundleCard from "./BundleCard";
import ItemCard from "./ItemCard";
import { PassSelectorProvider } from "@/contexts/PassSelectorContext";
// import { usePassSelectorState } from '../contexts/PassSelectorContext';
import PassDebug from "./PassDebug";
import { EventModelType } from "@dance-engine/schemas/events";

const PassPicker = ({ event }: { event: EventModelType }) => {
  // const { selected } = usePassSelectorState();
  
  return (
      <PassSelectorProvider event={event}>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 items-start gap-6">
          {event.bundles && event.bundles.map((bundle: BundleTypeExtended) => (
            <BundleCard key={bundle.ksuid} bundleData={bundle} event={event} />
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 items-start gap-6 mt-6">
          {event && event.items && JSON.stringify(event.items) != "{}" && Object.keys(event.items).map((item_ksuid: string) => (
            event.items?.[item_ksuid] ? <ItemCard key={item_ksuid} itemData={event.items[item_ksuid]} /> : null
          ))}
        </div>

        <div className="hidden"><PassDebug event={event}/></div>

      </PassSelectorProvider>
  );
};

export default PassPicker