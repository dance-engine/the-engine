'use client'
import { OrganisationType } from '@dance-engine/schemas/organisation';

export default function RebelHero({ org }: { org: OrganisationType }) {
  return (
    <div id="hero" className='w-full bg-contain bg-no-repeat relative bg-center flex items-center justify-center text-white font-bold bg-black' style={{ backgroundImage: `url(${org.banner})` }}>
      <img src={org.banner} alt="" className='' />
      {org.banner_overlay && <div className='absolute bottom-0 right-0 left-0 border-green-500 overflow-hidden h-[100%] flex flex-col items-end justify-end xl:items-center'>
        {/* <h1 className='text-4xl text-center px-6 font-heading-latin-soul'>&lsquo;Liverpool Moves to Latin Soul.&rsquo;</h1> */}
        <img src={org.banner_overlay} alt="Banner Overlay" className='object-top object-contain block max-h-[600px] w-[200px] sm:w-[300px] md:w-[400px] lg:w-[800px]' />
      </div>}
    </div>
  );
}