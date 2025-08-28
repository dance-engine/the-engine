export const dynamic = 'force-dynamic';
import { headers } from 'next/headers';
import EventList from '../components/EventList'
import DanceEngineFooter from '../components/footer/DanceEngine';
import Header from '@/components/header/Header';

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
import Link  from '@tiptap/extension-link'
import { generateHTML } from '@tiptap/html'

import { OrganisationType } from '@dance-engine/schemas/organisation';
import { EventResponseType } from '@dance-engine/schemas/events';

// Legacy Code from site launches
import RebelPayment from "../components/legacy/RebelPayment";
import POWPayment from "../components/legacy/POWPayment";

export default async function IndexPage() {
  const h = await headers();
  const orgSlug = h.get('x-site-org') || 'default-org';
  const theme = h.get('x-site-theme') || 'default';
  const domain = h.get('x-site-domain') || 'unknown';
  const coreEvent = orgSlug == 'demo2' ? "2vOyCJojl8ozmjx11c1tqwViE5O" : "cheese" ;


  const EVENTS_API_URL = coreEvent == "cheese" ? `${process.env.NEXT_PUBLIC_DANCE_ENGINE_API}/public/${orgSlug}/events` : `${process.env.NEXT_PUBLIC_DANCE_ENGINE_API}/public/${orgSlug}/events/${coreEvent}`
  const events_res = await fetch(EVENTS_API_URL, { next: { revalidate: 60 } });
  const ORGS_API_URL = `${process.env.NEXT_PUBLIC_DANCE_ENGINE_API}/public/organisations`
  const orgs_res = await fetch(ORGS_API_URL, { next: { revalidate: 120 } });
  const orgs_data = await orgs_res.json()
  const org_details= orgs_data.organisations.filter((org_check: OrganisationType) => org_check.organisation && org_check.organisation == orgSlug)
  const org = org_details[0] || {name: 'Unknown Organisation', slug: 'unknown-org', description: '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"No organisation found for this domain"}]}]}'};
  const eventsServerData = await events_res.json() as EventResponseType[];

  console.log("requesting data", ORGS_API_URL) //, 'orgs_data', orgs_data) //, 'eventsServerData', eventsServerData);
  const css = `
    :root {
      --main-bg-color: black;
      --main-text-color: white;
      --alternate-bg-color: hsl(325, 100%, 20%);
      --highlight-color: hsl(324, 98%, 62%);
    }
      h1,h2,h3,h4,h5,h6 {
        font-family: var(--font-luckiest-guy);
      }
  `;
  const andreasCss = `
    :root {
      --main-bg-color: black;
      --main-text-color: white;
      --alternate-bg-color: #871d24;
      --highlight-color: hsla(350, 100%, 23%, 1.00);
    }
  `;



  const bodyFont = orgSlug == 'power-of-woman' || orgSlug == 'pow' ? 'font-oswald' : 'font-inter';

  return <div className={`w-full ${bodyFont}`} style={{ backgroundColor: 'var(--main-bg-color)', color: 'var(--main-text-color)' }}>
      { org.css_vars ? <style dangerouslySetInnerHTML={{ __html: org.css_vars }} /> : <style dangerouslySetInnerHTML={{ __html: orgSlug == 'rebel-sbk' ? andreasCss : css }} /> }
      
      <Header org={org}/>

      <main className='w-full justify-center' >

        <div id="hero" className={`w-full h-[60vh] XXmin-h-[550px] max-h-[1024px] 
        text-white flex items-stretch justify-center bg-no-repeat \
        ${theme == 'latin-soul' ?  "bg-cover bg-center": "bg-center sm:bg-center md:bg-auto bg-size-[1024px_auto] sm:bg-size-[1400px_auto]"}`} 
        style={{ backgroundImage: `url(${org.banner})` }}>
          <div className='max-w-4xl bg-amber-300/0 w-full px-4 sm:px-8 pt-4 sm:pt-8 relative'>
            
            { orgSlug == 'power-of-woman' ? <div className='max-w-[400px] XXmr-[400px] text-4xl font-bold'>{`${org.name} - an event exclusively for women`}</div> : null}

            { org.banner_overlay && <div className='relative bottom-[-6px] right-0 left-0 border-green-500 overflow-hidden h-[100%] flex flex-col items-center justify-start sm:flex-row sm:items-center sm:justify-center' >
              <h1 className='text-4xl text-center px-6 font-heading-latin-soul'>&lsquo;Some tagline about the artist or brand goes here&rsquo;</h1>
              <img src={org.banner_overlay} alt="Banner Overlay" className='object-top object-cover block h-[100%] max-h-[600px] w-full sm:w-[38%] sm:min-w-[300px] max-w-[500px] sm:self-end ' />
            </div>} 
          </div>
        </div>

        <div className=' w-full px-4 lg:px-0 flex justify-center border-t-6' style={{backgroundColor: 'var(--alternate-bg-color)', borderColor: 'var(--highlight-color)'}}>
          
            <div className={
              `max-w-4xl w-4xl px-4 lg:px-0 py-12 \
              prose prose-base prose-p:mb-2 prose-p:mt-0 prose-p:font-extralight prose-p:leading-relaxed prose-headings:font-semibold \
              prose-h1:text-4xl prose-h2:text-2xl prose-h3:text-xl prose-h4:text-lg \
              prose-headings:mb-1 prose-headings:mt-4 prose-h4:mb-0 \
               text-white prose-invert text-xl prose-li:marker:text-[var(--highlight-color)]
              `} 
                dangerouslySetInnerHTML={{ __html: generateHTML(
                  JSON.parse(org.description), 
                  [ Document, Paragraph, Text,  Bold, Strike, Italic, Heading, ListItem, BulletedList, OrderedList, Link],) }} 
              />
          
            {/* <pre className='w-full'>{JSON.stringify(org_details,null,2)}</pre> */}
            {/* <strong>headers</strong>: {domain}/{orgSlug}/{theme} */}
                <div className='hidden'>
                  {domain}/{orgSlug}/{theme} - VERCEL_ENV:{process.env.VERCEL_ENV}  VERCEL:{process.env.VERCEL} NODE_ENV:{process.env.NODE_ENV}

                </div>
                
        </div>
        {orgSlug == 'demo' || orgSlug == 'latin-soul' ? 
          // <div className='mb-12 '>{ eventsServerData && <EventList fallbackData={eventsServerData} event_ksuid={coreEvent} org={orgSlug} theme={theme} /> } </div> 
          <div className='mb-12 '>{ eventsServerData && <EventList fallbackData={eventsServerData} org={orgSlug} theme={theme} /> } </div> 
        : orgSlug == 'rebel-sbk' ? 
          <RebelPayment org={org} />
        :
        (<POWPayment org={org} />)
}
        
      </main>

      <DanceEngineFooter org={orgSlug} mode='dark' />

    </div>
}
