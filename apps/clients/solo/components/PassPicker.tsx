'use client';
import { BundleTypeExtended } from "@dance-engine/schemas/bundle";
import BundleCard from "./BundleCard";
import ItemCard from "./ItemCard";
import { PassSelectorProvider } from "@/contexts/PassSelectorContext";
import { CartProvider } from "@/contexts/CartContext";
// import { usePassSelectorState } from '../contexts/PassSelectorContext';
import PassDebug from "./PassDebug";
import { EventModelType } from "@dance-engine/schemas/events";

const PassPicker = ({ event }: { event: EventModelType }) => {
  // const { selected } = usePassSelectorState();
  
  return (
      <PassSelectorProvider event={event}>
        <div className={`grid grid-cols-1 max-w-full m-auto \
          ${event.bundles && event.bundles.length > 1 ? 'md:grid-cols-2 md:max-w-5xl' : ''}
          ${event.bundles && event.bundles.length > 2 ? 'xl:grid-cols-3 xl:max-w-full' : ''} \
          items-start gap-6`}>
          {event.bundles && event.bundles.map((bundle: BundleTypeExtended) => (
            <BundleCard key={bundle.ksuid} bundleData={bundle} event={event} />
          ))}
        </div>

        <div className={`grid m-auto \
          ${event.items && Object.keys(event.items).length > 1 ? 'grid-cols-2' : 'grid-cols-1'} \
          ${event.items && Object.keys(event.items).length > 2 ? 'md:grid-cols-3' : ''} \
          ${event.items && Object.keys(event.items).length > 3 ? 'xl:grid-cols-4' : ''} \
          items-start gap-6 mt-6`}>
          {event && event.items && JSON.stringify(event.items) != "{}" && Object.keys(event.items).map((item_ksuid: string) => (
            event.items?.[item_ksuid] ? <ItemCard key={item_ksuid} itemData={event.items[item_ksuid]} /> : null
          ))}
        </div>

        <div className="hidden"><PassDebug event={event}/></div>

        <CartProvider event={event}/>

      </PassSelectorProvider>
  );
};

export default PassPicker