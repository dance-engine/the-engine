import Link from "next/link"
import { ItemType, BundleTypeExtended } from "@dance-engine/schemas/bundle"
import { EventTypeExtended } from "@dance-engine/schemas/events"
import { Fragment } from "react"

export default function BundleCard({bundleData, eventData}: {bundleData: BundleTypeExtended, eventData: EventTypeExtended}) {
  const bundle = bundleData
  const items = eventData.items

  bundle.current_price = () => {
    return `£${(bundle.primary_price / 100).toFixed(2)}`;
  }

  bundle.current_price_name = () => {
    return bundle.primary_price_name;
  }

  bundle.items = () => {
    return items ? items.filter((itm: ItemType) => {
      return new Set(bundle.includes).has(itm.ksuid) && itm.status == 'live'
    }) : [];
  }

  return (
    <Fragment>
      <Link href={`/${eventData.ksuid}`} className="overflow-hidden rounded-lg bg-white shadow-sm dark:divide-white/10 dark:bg-gray-800/50 dark:shadow-none dark:outline dark:-outline-offset-1 dark:outline-white/10">
        <header className="px-4 py-5 sm:p-6 bg-keppel-on-light/90 ">
      
          <h1 className='text-2xl uppercase'>{bundle.name}</h1>
          <p>{bundle.description}</p>
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
      </header>
      <div className="px-4 py-4 sm:px-6 bg-keppel-on-light/50 flex align-center justify-center ">
         <button  className='rounded bg-keppel-logo px-4 py-1 text-white'>
          Add to Cart
        </button>
      </div>
    </Link>
    </Fragment>
  )
}