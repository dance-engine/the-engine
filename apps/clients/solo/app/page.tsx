import { headers } from 'next/headers';
import EventList from '../components/EventList'
import { EventType } from '@dance-engine/schemas/events';
import { format } from 'date-fns/format';
import { OrganisationType } from '@dance-engine/schemas/organisation';
// import Organisation from '@/components/Organisation';

export default async function IndexPage() {
  const h = await headers();
  const orgSlug = h.get('x-site-org') || 'default-org';
  const theme = h.get('x-site-theme') || 'default';
  const domain = h.get('x-site-domain') || 'unknown';
  const EVENTS_API_URL = `${process.env.NEXT_PUBLIC_DANCE_ENGINE_API}/public/${orgSlug}/events`
  const events_res = await fetch(EVENTS_API_URL, { next: { revalidate: 60 } });
  const ORGS_API_URL = `${process.env.NEXT_PUBLIC_DANCE_ENGINE_API}/public/organisations`
  const orgs_res = await fetch(ORGS_API_URL, { cache: 'force-cache', next: { revalidate: 240, tags: [format(new Date(), 'yyyy-MM-ddTHH:mm:ss.SSSxxx')] } });
  const orgs_data = await orgs_res.json()
  const org_details= orgs_data.filter((org_check: OrganisationType) => org_check.organisation && org_check.organisation == orgSlug)
  const org = org_details[0] || {name: 'Unknown Organisation', slug: 'unknown-org', description: 'No organisation found for this domain.'};
  const eventsServerData = await events_res.json() as EventType[];

  console.log("requesting data", ORGS_API_URL, 'orgs_data', orgs_data, 'eventsServerData', eventsServerData);

  return <div className=''>
      <header className='w-full bg-gray-900 text-white flex justify-center'>
        <div className='max-w-4xl w-4xl px-4 py-2  uppercase font-black lg:px-0'>
          {org.name}
        </div>
      </header>
      <main className='w-full flex justify-center'>
        <div className='max-w-4xl w-full  px-4 lg:px-0'>
          <div className='max-w-4xlw- 4xl px-0 lg:px-0 py-4'>
            <pre className='w-full'>{JSON.stringify(org_details,null,2)} -</pre>
            <strong>headers</strong>: {domain}/{orgSlug}/{theme}
          </div>
          { eventsServerData && <EventList fallbackData={eventsServerData} org={orgSlug} theme={theme} /> }
        </div>
      </main>
      
    </div>
}