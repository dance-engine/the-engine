import { headers } from "next/headers";
import { format } from "date-fns/format";
import type { OrganisationType } from "@dance-engine/schemas/organisation";
import EventSuccessExperience from "@dance-engine/ui/EventSuccessExperience";

const EventSuccessPage = async ({
  params,
}: {
  params: Promise<{ ksuid: string }>;
}) => {
  const { ksuid } = await params;
  const h = await headers();
  const orgSlug = h.get("x-site-org") || "default-org";

  const eventApiUrl = `${process.env.NEXT_PUBLIC_DANCE_ENGINE_API}/public/${orgSlug}/events/${ksuid}`;
  const orgApiUrl = `${process.env.NEXT_PUBLIC_DANCE_ENGINE_API}/public/${orgSlug}/settings`;

  const [eventRes, orgRes] = await Promise.all([
    fetch(eventApiUrl, { next: { revalidate: 60 } }),
    fetch(orgApiUrl, {
      next: {
        revalidate: 120,
        tags: [format(new Date(), "yyyy-MM-ddTHH:mm:ss.SSSxxx")],
      },
    }),
  ]);

  const eventData = await eventRes.json();
  const orgData = (await orgRes.json()) as { organisation?: OrganisationType };
  const org = orgData.organisation || {
    name: "Unknown Organisation",
    organisation: "unknown-org",
    status: "setup" as const,
    description:
      '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"No organisation found for this domain"}]}]}',
  };

  return (
    <EventSuccessExperience
      eventData={eventData}
      org={org}
      eventKsuid={ksuid}
    />
  );
};

export default EventSuccessPage;
