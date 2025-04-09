'use client';
import Link from 'next/link';
import useSWR from 'swr';
import type {EventType} from '@dance-engine/schemas/events'

const fetcher = (url: string) => fetch(url).then(res => res.json());
type EventTypeExtended = EventType & {event_slug: string }
export default function EventList({ fallbackData, org, theme}: { fallbackData: any, org: string, theme: string}) {
  const { data: events, isLoading } = useSWR(
    `${process.env.NEXT_PUBLIC_DANCE_ENGINE_API}/public/${org}/events`,
    fetcher,
    { fallbackData }
  );

  if (isLoading) return <p>Loading...</p>

  return <div>
    <h2 className='text-2xl '>Events</h2>
    {/* {org}:{theme} */}
    { events.map((event: EventTypeExtended) => {
      return <div key={event.event_slug} className='flex items-center gap-4'>
        <h2 className='text-xl'>{event.name}</h2>
        <Link href={`/${event.ksuid}`} className='rounded bg-cerise-logo px-4 py-1 text-white'>
          View
        </Link>
      </div>
    })}
    {/* <pre>{JSON.stringify(events, null, 2)}</pre> */}
    </div>

}
