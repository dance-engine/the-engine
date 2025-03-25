import { PromoCard } from '@dance-engine/ui/PromoCard'

export default function Home() {
  return (
    <div className="w-full px-4 lg:px-8 pb-0">
      <h1 className='text-3xl'>Welcome to Dance Engine</h1>
      <p>As soon as you have some events we&apos;ll show you stats here. For now lets get started</p>
      <div className="grid grid-cols-3 gap-6 pt-6">

        <PromoCard title='Congress' href="/events/new?type=congress&stuff=true" cta="Start a congress" colour='cerise'>
          <p>Multiple passes, bundles and deals across a multi day event</p>
        </PromoCard>

        <PromoCard title='Party' href="/events/new?type=party" cta="Plan a party" colour='pear'>
          <p>Evening event or series of events we can run them all</p>
        </PromoCard>

        <PromoCard title='Congress' href="/events/new?type=congress" cta="Start a congress" colour='keppel'>
          <p>Multiple passes, bundles and deals across a multi day event</p>
        </PromoCard>

      </div>
    </div>
  );
}
