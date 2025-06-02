'use client';
import Link from 'next/link';
import useSWR from 'swr';
import type {EventType} from '@dance-engine/schemas/events'

const fetcher = (url: string) => fetch(url).then(res => res.json());
type EventTypeExtended = EventType & {event_slug: string }
export default function Organisation({ fallbackData, org, theme}: { fallbackData: EventType[], org: string, theme: string}) {
  const { data, isLoading, error} = useSWR(
    `${process.env.NEXT_PUBLIC_DANCE_ENGINE_API}/public/${org}/events`,
    fetcher,
    { fallbackData }
  );

  if (isLoading && !fallbackData) return <p>Loading...{theme}</p>
  if (error) return <p>Error...{theme}</p>

  return <div className="max-w-full w-full">
    <h2 className='text-2xl '>Events</h2>
    {/* {org}:{theme} */}
    { data.events.map((event: EventTypeExtended) => {
      return <div key={event.ksuid} className='flex items-center justify-between gap-4 w-full mb-2'>
        <h2 className='text-xl'>{event.name}</h2>
        <Link href={`/${event.ksuid}`} className='rounded bg-cerise-logo px-4 py-1 text-white'>
          View
        </Link>
      </div>
    })}
    {/* <pre>{JSON.stringify(events, null, 2)}</pre> */}
    </div>

}
