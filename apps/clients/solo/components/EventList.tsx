'use client';
import Link from 'next/link';
import useSWR from 'swr';
import type {BundleType} from '@dance-engine/schemas/bundle';

const fetcher = (url: string) => fetch(url).then(res => res.json());
type BundleTypeExtended = BundleType & {event_slug: string, current_price: () => string, current_price_name: () => string, items: () => {name: string}[]};
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
     { bundles && bundles.map((bundle: BundleTypeExtended) => {

      bundle.current_price = () => {
        return `£${(bundle.primary_price / 100).toFixed(2)}`;
      }

       bundle.current_price_name = () => {
        return bundle.primary_price_name;
      }

      bundle.items = () => {
        return items.filter((itm: {ksuid: string}) => new Set(bundle.includes).has(itm.ksuid));
      }

      // const matches = items.filter(item => bundle.includes.includes(item.id));
      // bundle.items = matches;

      return <div key={event.ksuid} className='border rounded-lg flex flex-col items-center justify-between gap-4 mb-2 p-3'>
        <h2 className='text-2xl uppercase'>{bundle.name}</h2>
        <h3>{bundle.description}</h3>
        <p>{bundle.current_price_name()}: {bundle.current_price()}</p>
        {bundle.includes && (
          <ul>
            {bundle.items().map((item, index) => {
              
              return (
              <li key={index}>{JSON.stringify(item)}</li>
              )
            }
           )}
          </ul>
        )}
        <Link href={`/${event.ksuid}`} className='rounded bg-cerise-logo px-4 py-1 text-white'>
          View
        </Link>
      </div>
    })}
    </div>
    {/* {org}:{theme} */}
   
    {/* <pre>{JSON.stringify(data, null, 2)}</pre> */}
    </div>

}
