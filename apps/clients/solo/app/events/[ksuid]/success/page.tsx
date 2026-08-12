import { headers } from "next/headers";
import type { OrganisationType } from "@dance-engine/schemas/organisation";
import EventSuccess from "@dance-engine/ui/event/EventSuccess";

export default async function EventSuccessPage({ params }: { params: Promise<{ ksuid: string }> }) {
  const { ksuid } = await params;
  const requestHeaders = await headers();
  const orgSlug = requestHeaders.get("x-site-org") || "default-org";
  const [eventResponse, orgResponse] = await Promise.all([
    fetch(`${process.env.NEXT_PUBLIC_DANCE_ENGINE_API}/public/${orgSlug}/events/${ksuid}`, { next: { revalidate: 60 } }),
    fetch(`${process.env.NEXT_PUBLIC_DANCE_ENGINE_API}/public/${orgSlug}/settings`, {
      next: { revalidate: 30, tags: [`org-settings-${orgSlug}`] },
    }),
  ]);
  const eventData = await eventResponse.json();
  const orgData = (await orgResponse.json()) as { organisation?: OrganisationType };
  const org = orgData.organisation || {
    name: "Unknown Organisation",
    organisation: "unknown-org",
    status: "setup" as const,
    description: '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"No organisation found for this domain"}]}]}',
  };

  return <EventSuccess eventData={eventData} org={org} eventKsuid={ksuid} />;
}
