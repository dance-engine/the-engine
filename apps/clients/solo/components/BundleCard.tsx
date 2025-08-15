import Link from "next/link"
import { useContext } from "react"
import { ItemType, BundleTypeExtended } from "@dance-engine/schemas/bundle"
import { EventModelType, EventResponseType } from "@dance-engine/schemas/events"
import { Fragment } from "react"
import { PassSelectorContext, PassSelectorDispatchContext } from '../contexts/PassSelectorContext';

export default function BundleCard({bundleData, event }: { bundleData: BundleTypeExtended, event: EventModelType }) {
  const { selected, included } = useContext(PassSelectorContext);
  const dispatch = useContext(PassSelectorDispatchContext);
  const bundle = bundleData

  bundle.current_price = () => {
    return `£${(bundle.primary_price / 100).toFixed(2)}`;
  }

  bundle.current_price_name = () => {
    return bundle.primary_price_name;
  }

  // bundle.items = () => {
  //   return items ? items.filter((itm: ItemType) => {
  //     return new Set(bundle.includes).has(itm.ksuid) && itm.status == 'live'
  //   }) : [];
  // }

  return (
    <Fragment>
      <div onClick={() => {dispatch(bundleData); navigator.clipboard.writeText(bundleData.ksuid || "none")} } 
        className="relative overflow-hidden h-full flex flex-col justify-items-stretch rounded-lg bg-white shadow-sm dark:divide-white/10 dark:bg-gray-800/50 dark:shadow-none dark:outline dark:-outline-offset-1 dark:outline-white/10">
        <header className="px-4 py-5 sm:p-6 flex-1 bg-keppel-on-light/90 ">
      
          <h1 className='text-2xl uppercase'>{bundle.name}</h1>
          <p>{bundle.description}</p>
          <p>{bundle.current_price_name()}: {bundle.current_price()}</p>

          {bundle.includes && (
            <div>Includes:
              <ul className='flex gap-1'>
                {bundle.includes.filter((item_id) => event?.items?.[item_id] ).map((item_id) => {
                  
                  return (
                  <li key={item_id} >{event?.items?.[item_id]?.name}, </li>
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
      
      { selected 
        && selected.length > 0 
        && selected.includes(bundle.ksuid) 
        && <div className="overflow-hidden absolute top-0 h-full w-full bg-black/70 text-white flex flex-col items-center justify-center">
          
          Selected <br/>
          {selected.map((s) => (<p key={s}>{`${s},`}</p>) )}
          Includes
          {bundle.includes.map((s) => (<p key={s}>{`${s},`}</p>) )}
      </div>
      }
    </div>
    </Fragment>
  )
}