'use client';
import useSWR from 'swr';
import {createEvent} from '@dance-engine/schemas/events';
import Link from 'next/link';

import { EventResponseType } from '@dance-engine/schemas/events';
import { format } from 'date-fns'

const fetcher = (url: string) => fetch(url).then(res => res.json());
export default function EventList({ fallbackData, org, event_ksuid, theme}: { fallbackData: EventResponseType[], org: string, event_ksuid?: string, theme: string}) {
  const { data, isLoading, error} = useSWR(
    event_ksuid ? `${process.env.NEXT_PUBLIC_DANCE_ENGINE_API}/public/${org}/events/${event_ksuid}` : `${process.env.NEXT_PUBLIC_DANCE_ENGINE_API}/public/${org}/events`,
    fetcher,
    { fallbackData }
  );

  
  if (isLoading && !fallbackData) return <p>Loading...{theme}</p>
  if (error) return <p>Error...{theme}</p>

  const eventData = data.events as EventResponseType[];
  const events = eventData ? eventData.filter((event) => event.status === "live").map((item) => { return createEvent(item) }) : []

  return <div className=''>
    <div className="mx-auto w-full flex flex-col sm:flex-row max-w-5xl pt-6 px-6 5xl:px-0 gap-6">
      {events.map((event) => {
        return (
          <Link href={`/${event.ksuid}`} style={{'--image-url': `url(${event.banner})`} as React.CSSProperties} key={event.ksuid} className='mb-12 rounded-lg bg-[image:var(--image-url)] flex items-end bg-cover bg-center aspect-square min-w-[300px]'>
            
            <div className='p-3 w-full bg-black/50'>
              {event.category && <div className='flex gap-1'>
                {event.category.map((cat) => {return (<span key={cat} className='bg-cerise-on-light text-white text-xs px-2 py-0 rounded-full'>{cat}</span>)})}      
              </div>}
              <h2 className='text-xl font-bold mt-2'>{event.name}</h2>      
              <p className=''>{format(event.starts_at, 'do MMM yyyy, HH:mm')} - {format(event.ends_at, 'HH:mm')}</p>
            </div>
            
                        
          </Link>
        )
      })}
      
    {/* <PassPicker event={event}/> */}
    {/* <h2 className='text-2xl '>Purchase Options</h2>
    <div className='flex gap-2'>
     { bundles && bundles.map((bundle: BundleTypeExtended) => <BundleCard key={bundle.ksuid} eventData={event} bundleData={bundle} />)}
    </div>

    <div className='flex gap-2'>
     { items && items.map((itm: ItemType) => <ItemCard key={itm.ksuid} itemData={itm} eventData={event}/>)}
    </div> */}
    {/* {org}:{theme} */}
    {/* <pre>{JSON.stringify(data, null, 2)}</pre> */}
    </div>
    {/* <pre>{JSON.stringify(fallbackData, null, 2)}</pre> */}
  </div>
}
