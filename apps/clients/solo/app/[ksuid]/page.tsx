import { headers } from "next/headers";
import { format } from "date-fns/format";
import { EventType } from "@dance-engine/schemas/events";
import type { OrganisationType } from "@dance-engine/schemas/organisation";
import Event from "../../components/Event";
import EventExperience from "@dance-engine/ui/EventExperience";
import Header from "@/components/header/Header";
import DanceEngineFooter from "@/components/footer/DanceEngine";

const EventPage = async ({
  params,
  searchParams,
}: {
  params: Promise<{ ksuid: string }>;
  searchParams: Promise<{ layout?: string }>;
}) => {
  const { ksuid } = await params;
  const { layout } = await searchParams;
  const useV2 = layout === "v2";
  const h = await headers();
  const orgSlug = h.get("x-site-org") || "default-org";
  const theme = h.get("x-site-theme") || "default";
  const apiUrl = `${process.env.NEXT_PUBLIC_DANCE_ENGINE_API}/public/${orgSlug}/events/${ksuid}`;
  const eventRes = await fetch(apiUrl, {
    next: { revalidate: 60 },
  });

  let org:
    | OrganisationType
    | {
        name: string;
        slug?: string;
        organisation?: string;
        description: string;
      };

  if (useV2) {
    const orgApiUrl = `${process.env.NEXT_PUBLIC_DANCE_ENGINE_API}/public/${orgSlug}/settings`;
    const orgRes = await fetch(orgApiUrl, {
      next: {
        revalidate: 120,
        tags: [format(new Date(), "yyyy-MM-ddTHH:mm:ss.SSSxxx")],
      },
    });
    const orgData = (await orgRes.json()) as {
      organisation?: OrganisationType;
    };
    org = orgData.organisation || {
      name: "Unknown Organisation",
      organisation: "unknown-org",
      description:
        '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"No organisation found for this domain"}]}]}',
    };
  } else {
    const orgsApiUrl = `${process.env.NEXT_PUBLIC_DANCE_ENGINE_API}/public/organisations`;
    const orgsRes = await fetch(orgsApiUrl, {
      cache: "force-cache",
      next: {
        revalidate: 120,
        tags: [format(new Date(), "yyyy-MM-ddTHH:mm:ss.SSSxxx")],
      },
    });
    const orgsData = (await orgsRes.json()) as {
      organisations: OrganisationType[];
    };
    const orgDetails = orgsData.organisations.filter(
      (orgCheck: OrganisationType) =>
        orgCheck.organisation && orgCheck.organisation === orgSlug,
    );
    org = orgDetails[0] || {
      name: "Unknown Organisation",
      slug: "unknown-org",
      description:
        '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"No organisation found for this domain"}]}]}',
    };
  }

  const serverData = (await eventRes.json()) as EventType[];

  if (useV2) {
    return (
      <div className="min-h-screen">
        <main className="w-full flex flex-col items-center flex-1">
          <EventExperience
            fallbackData={serverData}
            org={org as OrganisationType}
            eventKsuid={ksuid}
          />
          {"account_id" in org && org.account_id ? (
            <p className="text-sm mt-4 hidden">
              Stripe Account: {org.account_id}
            </p>
          ) : null}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-de-background-dark text-white">
      <Header org={org as OrganisationType} />
      <main className="w-full flex flex-col items-center flex-1">
        <Event
          fallbackData={serverData}
          org={org as OrganisationType}
          theme={theme}
          eventKsuid={ksuid}
        />
        {"account_id" in org && org.account_id ? (
          <p className="text-sm mt-4 hidden">
            Stripe Account: {org.account_id}
          </p>
        ) : null}
      </main>
      <DanceEngineFooter />
    </div>
  );
};

export default EventPage;
