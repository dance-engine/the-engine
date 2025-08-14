import Link from "next/link"
import { ItemType } from "@dance-engine/schemas/bundle"
import { EventResponseType } from "@dance-engine/schemas/events"

export default function ItemCard({itemData, eventData}: {itemData: ItemType, eventData: EventResponseType}) {

  return (
        
      
      <Link href={`/${eventData.ksuid}`} className="overflow-hidden rounded-lg bg-white shadow-sm dark:divide-white/10 dark:bg-gray-800/50 dark:shadow-none dark:outline dark:-outline-offset-1 dark:outline-white/10">
      <header className="px-4 py-5 sm:p-6 bg-cerise-on-light/90 ">
        <h1 className='text-2xl uppercase'>{itemData.name}</h1>
        <p>{itemData.description}</p>
      
      </header>
      <div className="px-4 py-4 sm:px-6 bg-cerise-on-light/50 flex align-center justify-center ">
         <button  className='rounded bg-cerise-logo px-4 py-1 text-white'>
          Add to Cart
        </button>
      </div>
    </Link>
  )
}