import { headers } from "next/headers";
import type { OrganisationType } from "@dance-engine/schemas/organisation";
import Header from "@/components/header/Header";
import DanceEngineFooter from "@/components/footer/DanceEngine";
import MediaGalleryPageClient from "@/components/MediaGalleryPageClient";

export default async function MediaPage({ params }: { params: Promise<{ ksuid: string }> }) {
  const { ksuid } = await params;
  const requestHeaders = await headers();
  const orgSlug = requestHeaders.get("x-site-org") || "default-org";

  const [orgResponse, eventResponse] = await Promise.all([
    fetch(`${process.env.NEXT_PUBLIC_DANCE_ENGINE_API}/public/${orgSlug}/settings`, {
      next: { revalidate: 30, tags: [`org-settings-${orgSlug}`] },
    }),
    fetch(`${process.env.NEXT_PUBLIC_DANCE_ENGINE_API}/public/${orgSlug}/events/${ksuid}`, {
      next: { revalidate: 30 },
    }),
  ]);
  const orgData = (await orgResponse.json()) as { organisation?: OrganisationType };
  const eventData = await eventResponse.json();
  const org = orgData.organisation || ({
    name: "Unknown Organisation",
    organisation: "unknown-org",
    description: '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"No organisation found for this domain"}]}]}',
  } as OrganisationType);

  return (
    <div className="flex min-h-screen flex-col bg-de-background-dark text-white">
      <Header org={org} />
      <main className="flex w-full flex-1 flex-col items-center px-0">
        <MediaGalleryPageClient event={eventData?.event || null} org={org} eventKsuid={ksuid} orgSlug={orgSlug} />
      </main>
      <DanceEngineFooter />
    </div>
  );
}
