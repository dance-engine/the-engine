import { ItemType } from "@dance-engine/schemas/bundle"
import { usePassSelectorState, usePassSelectorActions } from '../contexts/PassSelectorContext';


export default function ItemCard({itemData}: {itemData: ItemType}) {
  const { selected, included} = usePassSelectorState();
  const { toggleItem } = usePassSelectorActions();

  const inABundle = ( included 
          && included.length > 0 
          && included.flatMap(arr => arr).includes(itemData.ksuid) 
        )
  const inDirect = (
          selected 
          && selected.length > 0 
          && selected.includes(itemData.ksuid) 
        )
  const inCart = ( inABundle || inDirect )
  const ignoreToggle = (ignore:ItemType)=>{ console.log(`ignore ${ignore} toggle`) }

  
  return (


      <div onClick={()=>{(inDirect ? toggleItem : inABundle ? ignoreToggle : toggleItem)(itemData)}} 
        className={`${inDirect ? 'ring-6 ring-pear-logo' : null} relative overflow-hidden rounded-lg bg-white shadow-sm dark:divide-white/10 dark:bg-gray-800/50 dark:shadow-none dark:outline dark:-outline-offset-1 dark:outline-white/10`}>
      <header className="px-4 py-5 sm:p-6 bg-cerise-on-light/90 ">
        <h1 className='text-2xl uppercase'>{itemData.name}</h1>
        {/* <p>{itemData.description}</p> */}
        {/* <p>{itemData.ksuid}</p> */}
        <p>{itemData.primary_price_name}: £{(itemData.primary_price / 100).toFixed(2)}</p>
      </header>
      <div className="px-4 py-4 sm:px-6 bg-cerise-on-light/50 flex align-center justify-center ">
         <button  className='rounded bg-cerise-logo px-4 py-1 text-white'>
          Add to Cart
        </button>
      </div>
      { 
        inCart
        && <div className={`${inDirect ? 'text-pear-logo' : 'text-white'} overflow-hidden absolute top-0 h-full w-full bg-black/70 text-2xl flex flex-col items-center justify-center`}>
          {inDirect ? "Selected" : "Included"}
      </div>}
    </div>
  )
}