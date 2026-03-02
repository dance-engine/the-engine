import { headers } from 'next/headers';
import { format } from 'date-fns/format';
import { BsInstagram } from 'react-icons/bs';
import { OrganisationType } from '@dance-engine/schemas/organisation';
import Header from '@/components/header/Header';
import DanceEngineFooter from '@/components/footer/DanceEngine';
import { artists } from '../artists-data';

const ArtistsPage = async ({ params }: {params: Promise<{ slug: string }>}) => {  
  const {slug} = await params; // Extract slug if it exists, else null

  const css = `
      :root {
        --main-bg-color: black;
        --main-text-color: white;
        --alternate-bg-color: hsl(325, 100%, 20%);
        --highlight-color: hsl(324, 98%, 62%)
      }
    `;
  const h = await headers();
  const orgSlug = h.get('x-site-org') || 'default-org';
  const theme = h.get('x-site-theme') || 'default';
  const ORGS_API_URL = `${process.env.NEXT_PUBLIC_DANCE_ENGINE_API}/public/organisations`
  const orgs_res = await fetch(ORGS_API_URL, { cache: 'force-cache', next: { revalidate: 120, tags: [format(new Date(), 'yyyy-MM-ddTHH:mm:ss.SSSxxx')] } });
  const orgs_data = await orgs_res.json()
  const org_details= orgs_data.organisations.filter((org_check: OrganisationType) => org_check.organisation && org_check.organisation == orgSlug)
  const org = org_details[0] || {name: 'Unknown Organisation', slug: 'unknown-org', description: '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"No organisation found for this domain"}]}]}'};
  


  return <div className='min-h-screen flex flex-col bg-de-background-dark text-white'>
      <style dangerouslySetInnerHTML={{ __html: css }} />

      <Header org={org} /> 
      <main className='w-full justify-center' >
        <div id="hero" className={`w-full min-h-[300px] text-white flex items-stretch justify-center bg-no-repeat \
          ${theme == 'latin-soul' ?  "bg-cover bg-center": "bg-cover bg-top sm:bg-center md:bg-top sm:bg-size-[1400px_auto] md:bg-cover"}`} 
          style={{ backgroundImage: `url(${artists[slug]?.image || '/artists/default.jpg'})` }}
        >
        </div>
        <div className=' w-full px-4 lg:px-0 flex justify-center border-t-6' style={{backgroundColor: 'var(--alternate-bg-color)', borderColor: 'var(--highlight-color)'}}>
          <div className={
              `max-w-4xl w-4xl px-4 lg:px-0 py-12 \
              prose prose-base prose-p:mb-2 prose-p:mt-0 prose-p:font-extralight prose-p:leading-relaxed prose-headings:font-semibold \
              prose-h1:text-4xl prose-h2:text-2xl prose-h3:text-xl prose-h4:text-lg \
              prose-headings:mb-1 prose-headings:mt-4 prose-h4:mb-0 \
               text-white prose-invert text-xl prose-li:marker:text-[var(--highlight-color)]
               prose-a:*:text-[var(--highlight-color)] prose-a:no-underline prose-a:*:hover:text-[var(--highlight-color)]/80
              `}>
              <h1>{artists[slug]?.name || 'Unknown Artist'}</h1>
              {artists[slug]?.bio.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
              {artists[slug]?.instagram && (
                <div className='mt-6 pt-6 flex'>
                  <a href={artists[slug].instagram} target="_blank" rel="noopener noreferrer" className='text-3xl inline-flex items-center'>
                    <BsInstagram /> <span className='ml-2 text-xl'>{artists[slug].handle}</span>
                  </a>
                </div>
              )}
              </div>
        </div>
      </main>
      <DanceEngineFooter/>
    </div>
}
  export default ArtistsPage