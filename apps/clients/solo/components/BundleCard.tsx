import { BundleTypeExtended, ItemType } from "@dance-engine/schemas/bundle"
import { EventModelType } from "@dance-engine/schemas/events"
import { Fragment } from "react"
import { usePassSelectorState, usePassSelectorActions } from '../contexts/PassSelectorContext';

export default function BundleCard({bundleData, event }: { bundleData: BundleTypeExtended, event: EventModelType }) {
const { selected, included} = usePassSelectorState();
const { toggleBundle } = usePassSelectorActions();

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

  const saving = bundle.includes ? bundle.includes.map((item_id) => event?.items?.[item_id] ).reduce((acc, item) => {
    return acc + (item?.primary_price || 0);
  }, 0) - bundle.primary_price : 0;
  const isIncluded = (included && included.length > 0 && (new Set(bundle.includes)).isSubsetOf(new Set([...included.flat(), ...selected])));
  const isSelected = selected && selected.length > 0 && selected.includes(bundle.ksuid)
  const ignoreToggle = (bundle: BundleTypeExtended, items: Record<string, ItemType>)=>{ console.debug(`ignore ${bundle.name} toggle, ${items}`) }

  return (
    <Fragment>
      <div onClick={() => {(isIncluded && !isSelected ? ignoreToggle : toggleBundle)(bundleData,event.items || {}) }  } 
        className={`${isSelected ? 'ring-6 ring-pear-logo' : null} relative overflow-hidden h-full flex flex-col justify-items-stretch rounded-lg bg-white shadow-sm dark:divide-white/10 dark:bg-gray-800/50 dark:shadow-none dark:outline dark:-outline-offset-1 dark:outline-white/10`}>
        <header className="px-4 py-5 sm:p-6 flex-1 bg-keppel-on-light/90 ">
      
          <h1 className='text-2xl uppercase'>{bundle.name}</h1>
          <p>{bundle.description}</p>
          <p>{bundle.current_price_name()}: {bundle.current_price()}</p>
          <p>{bundle.ksuid}</p>
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
          <div>Saves £{(saving / 100).toFixed(2)}</div>
      </header>
      <div className="px-4 py-4 sm:px-6 bg-keppel-on-light/50 flex align-center justify-center ">
         <button  className='rounded bg-keppel-logo px-4 py-1 text-white'>
          Add to Cart
        </button>
      </div>
      
      {  
        (isSelected || isIncluded) && <div className={`overflow-hidden absolute top-0 h-full w-full bg-black/70 ${isSelected ? 'text-pear-logo font-bold' : 'text-white'}  text-3xl flex flex-col items-center justify-center`}>
          
          {isSelected ?  "Selected" : "Included" } <br/>
          {/* { isIncluded ? "IsIncluded" : null }
          { isSelected ? "isSelected" : null } */}
          {/* {selected.map((s) => (<p key={s}>{`${s},`}</p>) )} */}
          {/* Includes */}
          {/* {bundle.includes.map((s) => (<p key={s}>{`${s},`}</p>) )} */}
      </div>
      }
    </div>
    </Fragment>
  )
}