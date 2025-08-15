import { useContext } from "react";
import { ItemType } from "@dance-engine/schemas/bundle"
import { PassSelectorContext, PassSelectorDispatchContext } from '../contexts/PassSelectorContext';


export default function ItemCard({itemData}: {itemData: ItemType}) {
  const { selected: selected, included } = useContext(PassSelectorContext);
  const dispatch = useContext(PassSelectorDispatchContext);
  const inCart = (( included 
          && included.length > 0 
          && included.flatMap(arr => arr).includes(itemData.ksuid) 
        ) || (
          selected 
          && selected.length > 0 
          && selected.includes(itemData.ksuid) 
        ))
  return (
        
      
      <div onClick={()=>{dispatch(itemData)}} className="relative overflow-hidden rounded-lg bg-white shadow-sm dark:divide-white/10 dark:bg-gray-800/50 dark:shadow-none dark:outline dark:-outline-offset-1 dark:outline-white/10">
      <header className="px-4 py-5 sm:p-6 bg-cerise-on-light/90 ">
        <h1 className='text-2xl uppercase'>{itemData.name}</h1>
        <p>{itemData.description}</p>
        <p>{itemData.ksuid}</p>
      </header>
      <div className="px-4 py-4 sm:px-6 bg-cerise-on-light/50 flex align-center justify-center ">
         <button  className='rounded bg-cerise-logo px-4 py-1 text-white'>
          Add to Cart
        </button>
      </div>
      { 
        inCart
        && <div className="overflow-hidden absolute top-0 h-full w-full bg-black/70 text-white flex flex-col items-center justify-center">
          Included
      </div>}
    </div>
  )
}