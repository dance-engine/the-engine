import { headers } from 'next/headers';
import Event from '../../components/Event'
import Link from 'next/link';
import { EventType } from '@dance-engine/schemas/events';

const EventPage = async ({ params }: {params: Promise<{ ksuid: string }>}) => {  
  const {ksuid} = await params; // Extract ksuid if it exists, else null
  const h = await headers();
  const org = h.get('x-site-org') || 'default-org';
  const theme = h.get('x-site-theme') || 'default';
  const API_URL = `${process.env.NEXT_PUBLIC_DANCE_ENGINE_API}/public/${org}/events/${ksuid}`
  const res = await fetch(API_URL, {
    next: { revalidate: 60 }  // 60s cache
  });

  const serverData = await res.json() as EventType[];

  return <div className=''>
      <header className='w-full bg-gray-900 text-white flex justify-center'>
        <div className='max-w-4xl w-4xl px-4 py-2 bg-cover uppercase font-black lg:px-0'>
          <Link href="/">{org}</Link>
        </div>
      </header>
      <main className='w-full flex flex-col items-center'>
        <Event fallbackData={serverData} org={org} theme={theme} eventKsuid={ksuid} />
      </main>
      
    </div>
}

export default EventPage