import { headers } from 'next/headers';
// import EventList from '../components/EventList'
import Document from '@tiptap/extension-document'
import Paragraph from '@tiptap/extension-paragraph'
import Text from '@tiptap/extension-text'
import Bold from '@tiptap/extension-bold'
import Strike from '@tiptap/extension-strike'
import Italic from '@tiptap/extension-italic'
import Heading  from '@tiptap/extension-heading'
import BulletedList  from '@tiptap/extension-bullet-list'
import OrderedList  from '@tiptap/extension-ordered-list'
import ListItem  from '@tiptap/extension-list-item'
import { generateHTML } from '@tiptap/html'
import { EventType } from '@dance-engine/schemas/events';
import { format } from 'date-fns/format';
import { OrganisationType } from '@dance-engine/schemas/organisation';
import StripePurchaseButton from '@/components/StripePurchaseButton';
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

        <div id="hero" className='w-full h-[60vh] XXmin-h-[550px] max-h-[1024px] 
        text-white flex items-stretch justify-center bg-no-repeat bg-center md:bg-auto bg-size-[1400px_auto]' style={{ backgroundImage: `url(${org.banner})` }}>
          <div className='max-w-4xl w-full p-8 overflow-hidden'>
            <div className='max-w-[400px] XXmr-[400px] text-4xl font-bold'>
              {org.name} Strapline
            </div>
            
          </div>
        </div>

        <div className=' w-full px-4 lg:px-0 flex justify-center border-t-6' style={{backgroundColor: 'var(--alternate-bg-color)', borderColor: 'var(--highlight-color)'}}>
          
            <div className={
              `max-w-4xl w-4xl px-4 lg:px-0 py-12 \
              prose prose-base prose-p:mb-2 prose-p:mt-0  prose-p:leading-tight prose-headings:font-semibold \
              prose-h1:text-4xl prose-h2:text-2xl prose-h3:text-xl prose-h4:text-lg \
              prose-headings:mb-1 prose-headings:mt-4 prose-h4:mb-0 \
               text-white prose-invert text-xl prose-li:marker:text-[var(--highlight-color)]
              `} 
                dangerouslySetInnerHTML={{ __html: generateHTML(
                  JSON.parse(org.description), 
                  [ Document, Paragraph, Text,  Bold, Strike, Italic, Heading, ListItem, BulletedList, OrderedList],) }} 
              />
          
            {/* <pre className='w-full'>{JSON.stringify(org_details,null,2)}</pre> */}
            {/* <strong>headers</strong>: {domain}/{orgSlug}/{theme} */}
                <div className='hidden'>
                  {domain}/{orgSlug}/{theme}
                </div>
        </div>

        <div className='w-full px-4 lg:px-0 flex justify-center border-t-6' style={{backgroundColor: 'var(--main-bg-color)', borderColor: 'var(--highlight-color)'}}>
           <div className={`max-w-4xl px-4 lg:px-0 py-24 flex flex-col items-center\ `}>
            <h2 className='text-4xl font-bold mb-4'>Early Bird Ticket</h2>
            <p className='mb-6 text-xl'>We have a limited amount of early bird discounted tickets at only £40</p>
            <StripePurchaseButton 
              accountId='acct_1Rkp1ODIMY9TzhzF'
              couponCode="fVKhBZim" 
              priceId="price_1RkrE1DIMY9TzhzF2AFDc6q3"
              style={{backgroundColor: 'var(--highlight-color)'}} className='rounded px-8 py-6 text-4xl'  
            />
           </div>
        </div>

        {/* { eventsServerData && <EventList fallbackData={eventsServerData} org={orgSlug} theme={theme} /> } */}
      </main>
      
    </div>
}