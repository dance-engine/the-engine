'use client';
import Link from 'next/link';
import useSWR from 'swr';

import Bundle from "../components/Bundle"

import type { BundleType, BundleTypeExtended} from '@dance-engine/schemas/bundle';

const fetcher = (url: string) => fetch(url).then(res => res.json());
export default function EventList({ fallbackData, org, event_ksuid, theme}: { fallbackData: BundleType[], org: string, event_ksuid: string, theme: string}) {
  const { data, isLoading, error} = useSWR(
    event_ksuid ? `${process.env.NEXT_PUBLIC_DANCE_ENGINE_API}/public/${org}/events/${event_ksuid}` : `${process.env.NEXT_PUBLIC_DANCE_ENGINE_API}/public/${org}/events`,
    fetcher,
    { fallbackData }
  );

  if (isLoading && !fallbackData) return <p>Loading...{theme}</p>
  if (error) return <p>Error...{theme}</p>

  const event = data.event
  const bundles = data.event.bundles || [];
  const items = data.event.items || [];
  return <div className="max-w-full w-full p-3">
    <h2 className='text-2xl '>Purchase Options</h2>
    <div className='flex gap-2'>
     { bundles && bundles.map((bundle: BundleTypeExtended) => <Bundle key={bundle.ksuid} eventData={event} bundleData={bundle} />)}
    </div>
    {/* {org}:{theme} */}
    <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>

}
