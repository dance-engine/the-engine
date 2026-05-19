import { headers } from 'next/headers'
import { format } from 'date-fns/format'
import type { OrganisationType } from '@dance-engine/schemas/organisation'
import Header from '@/components/header/Header'
import DanceEngineFooter from '@/components/footer/DanceEngine'
import MediaGalleryClient from '../../../components/MediaGalleryClient'

const MediaPage = async ({ params }: { params: Promise<{ ksuid: string }> }) => {
  const { ksuid } = await params
  const h = await headers()
  const orgSlug = h.get('x-site-org') || 'default-org'

  // Fetch organization details
  const orgApiUrl = `${process.env.NEXT_PUBLIC_DANCE_ENGINE_API}/public/${orgSlug}/settings`
  const orgRes = await fetch(orgApiUrl, {
    next: {
      revalidate: 120,
      tags: [format(new Date(), 'yyyy-MM-ddTHH:mm:ss.SSSxxx')],
    },
  })
  const orgData = (await orgRes.json()) as {
    organisation?: OrganisationType
  }
  const org = orgData.organisation || {
    name: 'Unknown Organisation',
    organisation: 'unknown-org',
    description:
      '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"No organisation found for this domain"}]}]}',
  } as OrganisationType

  return (
    <div className="min-h-screen flex flex-col bg-de-background-dark text-white">
      <Header org={org} />
      <main className="w-full flex flex-col items-center flex-1 px-4 py-8">
        <div className="w-full max-w-4xl">
          <h1 className="text-3xl font-bold mb-8">Event Photos</h1>

          <MediaGalleryClient eventKsuid={ksuid} orgSlug={orgSlug} />
        </div>
      </main>
      <DanceEngineFooter />
    </div>
  )
}

export default MediaPage
