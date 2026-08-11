import { PromoCard } from '@dance-engine/ui/PromoCard'
import NextImage from 'next/image'

export default function Home() {
  return (
    <div className="w-full px-4 lg:px-8 pb-0">



      <h1 className='text-3xl'>Welcome to Dance Engine</h1>

      <div className="w-full mt-6">
        <PromoCard
          className="max-w-sm"
          title='Event Scanner'
          href="https://scan.danceengine.co.uk"
          image={<NextImage src="/barcodescanner.png" width={90} height={150} alt="Event Scanner" />}
          cta="Scan attendees now"
          colour='keppel'
        >

          <p>Multiple passes, bundles and deals across a multi day event</p>
        </PromoCard>
      </div>

      <p className='mt-6'>As soon as you have some events we&apos;ll show you stats here. For now lets get started</p>
      <div className=" hidden grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6">

        <PromoCard title='Congress' href="/events/new?type=congress&stuff=true" cta="Start a congress" colour='cerise'>
          <p>Multiple passes, bundles and deals across a multi day event</p>
        </PromoCard>

        <PromoCard title='Party' href="/events/new?type=party" cta="Plan a party" colour='pear'>
          <p>Evening event or series of events we can run them all</p>
        </PromoCard>

        <PromoCard title='Class' href="/events/new?type=congress" cta="Run your classes" colour='keppel'>
          <p>Regular weekly event focussed on teaching. Allow bundles for multiple in the series</p>
        </PromoCard>

      </div>
    </div>
  );
}
