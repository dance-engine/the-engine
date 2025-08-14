'use client';
import useSWR from 'swr';
import {createEvent} from '@dance-engine/schemas/events';
import PassPicker from '../components/PassPicker';

import { EventResponseType } from '@dance-engine/schemas/events';

const fetcher = (url: string) => fetch(url).then(res => res.json());
export default function EventList({ fallbackData, org, event_ksuid, theme}: { fallbackData: EventResponseType[], org: string, event_ksuid: string, theme: string}) {
  const { data, isLoading, error} = useSWR(
    event_ksuid ? `${process.env.NEXT_PUBLIC_DANCE_ENGINE_API}/public/${org}/events/${event_ksuid}` : `${process.env.NEXT_PUBLIC_DANCE_ENGINE_API}/public/${org}/events`,
    fetcher,
    { fallbackData }
  );

  if (isLoading && !fallbackData) return <p>Loading...{theme}</p>
  if (error) return <p>Error...{theme}</p>

  const event = createEvent(data.event)

  return <div className=''>
    <div className="mx-auto w-full max-w-5xl pt-6 px-6 5xl:px-0">
    <PassPicker event={event} org={org} />
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
  </div>
}
