import { headers } from 'next/headers';
import EventList from '../components/EventList'
import { EventType } from '@dance-engine/schemas/events';

export default async function IndexPage() {
  const h = await headers();
  const org = h.get('x-site-org') || 'default-org';
  const theme = h.get('x-site-theme') || 'default';
  const API_URL = `${process.env.NEXT_PUBLIC_DANCE_ENGINE_API}/public/${org}/events`
  const res = await fetch(API_URL, {
    next: { revalidate: 60 }  // 60s cache
  });

  const serverData = await res.json() as EventType[];

  return <div className=''>
      <header className='w-full bg-gray-900 text-white flex justify-center'>
        <div className='max-w-4xl w-4xl px-4 py-2  uppercase font-black lg:px-0'>
          {org}
        </div>
      </header>
      <main className='w-full flex justify-center'>
        <div className='max-w-4xl w-4xl px-4 lg:px-0'>
          <div className='max-w-4xl w-4xl px-4 lg:px-0 py-4'>
            Some info about the organisation and maybe an image
          </div>
          <EventList fallbackData={serverData} org={org} theme={theme} />
        </div>
      </main>
      
    </div>
}