import { headers } from 'next/headers';
// import EventList from '../components/EventList'

import { EventType } from '@dance-engine/schemas/events';
import { format } from 'date-fns/format';
import { OrganisationType } from '@dance-engine/schemas/organisation';
import Link from 'next/link';
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

  const css = `
      :root {
        --main-bg-color: black;
        --main-text-color: white;
        --alternate-bg-color: hsl(325, 100%, 20%);
        --highlight-color: hsl(324, 98%, 62%)
      }
    `;

  return <div className='w-full' style={{ backgroundColor: 'var(--main-bg-color)', color: 'var(--main-text-color)' }}>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      
      <header className='w-full bg-black text-white flex justify-center'>
        <div className='max-w-4xl w-4xl px-4 uppercase font-black lg:px-0 py-3 flex items-center justify-center'>
          <Link href="/" className='block'>{org.logo ? <img src={org.logo} alt={org.name} className='max-w-48 w-48'/> : org.name}</Link>
        </div>
      </header>

      <main className='w-full justify-center' >
        <div className=' w-full px-4 lg:px-0 flex justify-center border-t-6' style={{backgroundColor: 'var(--alternate-bg-color)', borderColor: 'var(--highlight-color)'}}>
          
          <div className='max-w-4xl px-4 lg:px-0 py-24 flex flex-col items-center\ justify-center'>
            <h1 className='text-5xl mb-6 text-center'>Purchase Complete!</h1>
            <p className='text-xl mb-6'>We&apos;ll be sending out tickets closer to the time to the email given at checkout (so make sure you check)</p>
            <p className='text-xl mb-6'>In the meantime, feel free to tell people you&apos;re coming on social media and everywhere you dance!</p>

          </div>
            

        </div>    
        <div id="hero" className='w-full h-[60vh] XXmin-h-[550px] max-h-[1024px] text-white flex items-stretch justify-center bg-no-repeat bg-bottom md:bg-auto bg-size-[1400px_auto]' style={{ backgroundImage: `url(${org.banner})` }}>
          <div className='max-w-4xl w-full p-8 overflow-hidden'>
            <div className='max-w-[400px] XXmr-[400px] text-4xl font-bold'>
              {org.name}, an event exclusively for women
            </div>
            
          </div>
        </div>

        <div className='hidden'>
                  {domain}/{orgSlug}/{theme}
                </div>

        

        {/* { eventsServerData && <EventList fallbackData={eventsServerData} org={orgSlug} theme={theme} /> } */}
      </main>
      
    </div>
}