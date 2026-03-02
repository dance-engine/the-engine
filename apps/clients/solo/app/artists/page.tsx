import { headers } from 'next/headers';
import { format } from 'date-fns/format';
import { OrganisationType } from '@dance-engine/schemas/organisation';
import Header from '@/components/header/Header';
import DanceEngineFooter from '@/components/footer/DanceEngine';
import { artists } from './artists-data';
import Link from 'next/link';

const ArtistsListPage = async () => {  

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
  // const theme = h.get('x-site-theme') || 'default';
  const ORGS_API_URL = `${process.env.NEXT_PUBLIC_DANCE_ENGINE_API}/public/organisations`
  const orgs_res = await fetch(ORGS_API_URL, { cache: 'force-cache', next: { revalidate: 120, tags: [format(new Date(), 'yyyy-MM-ddTHH:mm:ss.SSSxxx')] } });
  const orgs_data = await orgs_res.json()
  const org_details= orgs_data.organisations.filter((org_check: OrganisationType) => org_check.organisation && org_check.organisation == orgSlug)
  const org = org_details[0] || {name: 'Unknown Organisation', slug: 'unknown-org', description: '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"No organisation found for this domain"}]}]}'};
  


  return <div className='min-h-screen flex flex-col bg-de-background-dark text-white'>
      <style dangerouslySetInnerHTML={{ __html: css }} />

      <Header org={org} /> 
      <main className='w-full justify-center' >
        <div className=' w-full px-4 lg:px-0 flex justify-center border-t-6' style={{backgroundColor: 'var(--alternate-bg-color)', borderColor: 'var(--highlight-color)'}}>
          <div className={`max-w-4xl w-4xl px-4 lg:px-0 mb-12 text-white text-xl `}> 
              <h1 className='text-4xl my-8'>Artists</h1>
              <p className='mb-8 text-lg leading-relaxed'>We&apos;re thrilled to bring together an incredible lineup of world-class dancers and choreographers from across the UK and beyond. Each artist brings their unique style, passion, and expertise to create an unforgettable experience. From salsa and bachata to contemporary movement and samba, our artists are dedicated to inspiring, educating, and connecting dancers of all levels. Click on any artist below to learn more about their journey and what they&apos;ll be sharing at our event.</p>
              <div className='sm:flex flex-wrap gap-3'>
                 {Object.keys(artists).sort().map((artistKey) => (
                <div key={artistKey} className='mb-2'>
                  <Link className="text-2xl bg-[var(--highlight-color)] px-3 py-1 hover:underline block rounded" href={`/artists/${artistKey}`}>{artists[artistKey].name}</Link>
                </div>
              ) )}
              </div>
             
          </div>
        </div>
      </main>
      <DanceEngineFooter/>
    </div>
}
  export default ArtistsListPage