'use client'
import { OrganisationType } from '@dance-engine/schemas/organisation';

interface PowHeroProps {
  org: OrganisationType;
  orgSlug: string;
  theme: string;
}

export default function PowHero({ org, orgSlug, theme }: PowHeroProps) {
  return (
    <div id="hero" className={`w-full OLDsm:h-[60vh] OLDmax-h-[1024px]
    text-white flex items-stretch justify-center bg-no-repeat \
    ${"bg-center bg-cover"}`}
    style={{ backgroundImage: `url(${org.banner})` }}>
      <div className='max-w-4xl w-full  relative '>

        {/* {orgSlug == 'power-of-woman' ? <div className='max-w-[400px] XXmr-[400px] text-4xl font-bold'>{`${org.name} - an event exclusively for women`}</div> : null} */}
        {/* {JSON.stringify(org,null,2)} */}
        {org.banner_overlay && <div className='relative w-full h-full overflow-hidden flex flex-col items-center justify-start sm:flex-row sm:items-center sm:justify-center'>
          {/* <h1 className='text-4xl text-center px-6 font-heading-latin-soul'>&lsquo;Liverpool Moves to Latin Soul.&rsquo;</h1> */}
          {/* <img src={org.banner_overlay} alt="Banner Overlay" className='object-top object-contain block h-[100%] w-full border-b-blue-400 border' /> */}
          <img src={org.banner_overlay} alt=""  />
        </div>}
      </div>
    </div>
  );
}