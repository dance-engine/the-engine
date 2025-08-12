import Link from "next/link"
import { EventType } from "@dance-engine/schemas/events"
import { ItemType, BundleType, BundleTypeExtended } from "@dance-engine/schemas/bundle"
import { EventTypeExtended } from "@dance-engine/schemas/events"

export default function Bundle({bundleData, eventData}: {bundleData: BundleTypeExtended, eventData: EventTypeExtended}) {
  const bundle = bundleData
  const items = eventData.items

  bundle.current_price = () => {
    return `£${(bundle.primary_price / 100).toFixed(2)}`;
  }

  bundle.current_price_name = () => {
    return bundle.primary_price_name;
  }

  bundle.items = () => {
    return items.filter((itm: ItemType) => {
      return new Set(bundle.includes).has(itm.ksuid) && itm.status == 'live'
    });
  }
  
  return (
    <div /*key={bundleData.ksuid}*/ className='border rounded-lg flex flex-col items-center justify-between gap-4 mb-2 p-3'>
        <h2 className='text-2xl uppercase'>{bundle.name}</h2>
        <h3>{bundle.description}</h3>
        <p>{bundle.current_price_name()}: {bundle.current_price()}</p>
        {bundle.includes && (
          <div>Includes:
          <ul className='flex gap-1'>
            {bundle.items().map((item, index) => {
              
              return (
              <li key={index} >{item.name}, </li>
              )
            }
           )}
          </ul>
          </div>
        )}
        <Link href={`/${eventData.ksuid}`} className='rounded bg-cerise-logo px-4 py-1 text-white'>
          View
        </Link>
      </div>
  )
}