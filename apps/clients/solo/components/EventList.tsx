'use client';
// Event List
// This component is used to display a list of events in a carousel format. 
// It fetches event data from the Dance Engine API and displays it as a card.  Each event card includes the event's banner, name, category, and start/end times. 
// Users can navigate through the events using previous and next buttons. The component also handles loading and error states gracefully.

import { useCallback, useEffect, useState } from 'react';
import useSWR from 'swr';
import {createEvent} from '@dance-engine/schemas/events';
import Link from 'next/link';
import useEmblaCarousel from 'embla-carousel-react';

import { EventResponseType } from '@dance-engine/schemas/events';
import { format } from 'date-fns'

const fetcher = (url: string) => fetch(url).then(res => res.json());
export default function EventList({ fallbackData, org, event_ksuid, theme}: { fallbackData: EventResponseType[], org: string, event_ksuid?: string, theme: string}) {
  const { data, isLoading, error} = useSWR(
    event_ksuid ? `${process.env.NEXT_PUBLIC_DANCE_ENGINE_API}/public/${org}/events/${event_ksuid}` : `${process.env.NEXT_PUBLIC_DANCE_ENGINE_API}/public/${org}/events`,
    fetcher,
    { fallbackData }
  );
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'start',
    dragFree: false,
    loop: false,
  });
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const updateControls = useCallback(() => {
    if (!emblaApi) return;
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    updateControls();
    emblaApi.on('select', updateControls);
    emblaApi.on('reInit', updateControls);

    return () => {
      emblaApi.off('select', updateControls);
      emblaApi.off('reInit', updateControls);
    };
  }, [emblaApi, updateControls]);

  
  if (isLoading && !fallbackData) return <p>Loading...{theme}</p>
  if (error) return <p>Error...{theme}</p>

  const eventData = data.events as EventResponseType[];
  const events = eventData ? eventData.filter((event) => event.status === "live").map((item) => { return createEvent(item) }) : []

  return <div className=''>
    {events && events.length > 0 ? (
      <div className="max-w-full w-auto pt-6 ">
        

        <div className="overflow-hidden px-3" ref={emblaRef}>
          <div className={`flex gap-6 ${!canScrollPrev && !canScrollNext ? 'justify-center' : ''}`}>
            {events.map((event) => {
              return (
                <div key={event.ksuid} className="flex-[0_0_88%] sm:flex-[0_0_52%] lg:flex-[0_0_38%] max-w-64 ">
                  <Link href={`/${event.ksuid}`} style={{'--image-url': `url(${event.banner})`} as React.CSSProperties} 
                    className='mb-12 rounded-lg bg-[image:var(--image-url)] flex items-end bg-cover bg-center aspect-square min-w-0 w-full max-h-64'>
                    <div className='p-3 w-full bg-black/50'>
                      {event.category && <div className='flex gap-1 flex-wrap'>
                        {event.category.map((cat) => {return (<span key={cat} className='bg-cerise-on-light text-white text-xs px-2 py-0 rounded-full'>{cat}</span>)})}
                      </div>}
                      <h2 className='text-xl font-bold mt-2'>{event.name}</h2>
                      <p className=''>{format(event.starts_at, 'do MMM yyyy, HH:mm')} - {format(event.ends_at, 'HH:mm')}</p>
                    </div>
                  </Link>
                </div>
              )
            })}
          </div>
        </div>

        {(canScrollPrev || canScrollNext) && (
          <div className="mb-4 px-6 flex justify-center gap-2">
            <button
              type="button"
              onClick={() => emblaApi?.scrollPrev()}
              disabled={!canScrollPrev}
              className="px-3 py-1 rounded-md border text-white disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ backgroundColor: 'var(--highlight-color)', borderColor: 'var(--highlight-color)' }}
              aria-label="Previous event"
            >
              Prev
            </button>
            <button
              type="button"
              onClick={() => emblaApi?.scrollNext()}
              disabled={!canScrollNext}
              className="px-3 py-1 rounded-md border text-white disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ backgroundColor: 'var(--highlight-color)', borderColor: 'var(--highlight-color)' }}
              aria-label="Next event"
            >
              Next
            </button>
          </div>
        )}

      </div>
    ) : <div className='text-center'>Check back for a list of classes and events coming soon</div>}
      
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
    {/* </div> */}
    {/* <pre>{JSON.stringify(fallbackData, null, 2)}</pre> */}
  </div>
}
