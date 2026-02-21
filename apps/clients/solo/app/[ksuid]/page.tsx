import { headers } from 'next/headers';
import Event from '../../components/Event'
import { EventType } from '@dance-engine/schemas/events';
import type { OrganisationType } from '@dance-engine/schemas/organisation';
import { format } from 'date-fns/format';
import Header from '@/components/header/Header';
import DanceEngineFooter from '@/components/footer/DanceEngine';

const EventPage = async ({ params }: {params: Promise<{ ksuid: string }>}) => {  
  const {ksuid} = await params; // Extract ksuid if it exists, else null
  const h = await headers();
  const orgSlug = h.get('x-site-org') || 'default-org';
  const theme = h.get('x-site-theme') || 'default';
  const API_URL = `${process.env.NEXT_PUBLIC_DANCE_ENGINE_API}/public/${orgSlug}/events/${ksuid}`
  const res = await fetch(API_URL, {
    next: { revalidate: 60 }  // 60s cache
  });
  const ORGS_API_URL = `${process.env.NEXT_PUBLIC_DANCE_ENGINE_API}/public/organisations`
  const orgs_res = await fetch(ORGS_API_URL, { cache: 'force-cache', next: { revalidate: 120, tags: [format(new Date(), 'yyyy-MM-ddTHH:mm:ss.SSSxxx')] } });
  const orgs_data = await orgs_res.json()
  const org_details= orgs_data.organisations.filter((org_check: OrganisationType) => org_check.organisation && org_check.organisation == orgSlug)
  const org = org_details[0] || {name: 'Unknown Organisation', slug: 'unknown-org', description: '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"No organisation found for this domain"}]}]}'};

  const serverData = await res.json() as EventType[];

  return <div className='min-h-screen flex flex-col bg-de-background-dark text-white'>
      <Header org={org} />
      <main className='w-full flex flex-col items-center flex-1'>
        <Event fallbackData={serverData} org={org} theme={theme} eventKsuid={ksuid} />
        {org.account_id && <p className='text-sm mt-4'>Stripe Account: {org.account_id}</p>}
      </main>
      <DanceEngineFooter/>
    </div>
}

export default EventPage