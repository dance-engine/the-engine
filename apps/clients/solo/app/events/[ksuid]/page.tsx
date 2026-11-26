import { headers } from "next/headers";
import Event from "@dance-engine/ui/Event";
import type { OrganisationType } from "@dance-engine/schemas/organisation";
import Header from "@/components/header/Header";
import DanceEngineFooter from "@/components/footer/DanceEngine";

export default async function EventPage({
  params,
  searchParams,
}: {
  params: Promise<{ ksuid: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { ksuid } = await params;
  // /events/<ksuid>?preview also shows the event while it is still a draft.
  const preview = "preview" in (await searchParams);
  const requestHeaders = await headers();
  const orgSlug = requestHeaders.get("x-site-org") || "default-org";
  const orgResponse = await fetch(
    `${process.env.NEXT_PUBLIC_DANCE_ENGINE_API}/public/${orgSlug}/settings`,
    {
      next: {
        revalidate: 30,
        tags: [`org-settings-${orgSlug}`],
      },
    },
  );
  const orgData = (await orgResponse.json()) as {
    organisation?: OrganisationType;
  };
  const org = orgData.organisation || ({
    name: "Unknown Organisation",
    organisation: "unknown-org",
    description:
      '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"No organisation found for this domain"}]}]}',
  } as OrganisationType);

  return (
    <div className="flex min-h-screen flex-col bg-de-background-dark text-white">
      <Header org={org} />
      <main className="flex w-full flex-1 flex-col items-center">
        {orgSlug === "default-org" ? (
          <div>Loading Event</div>
        ) : (
          <Event org={org} eventKsuid={ksuid} preview={preview} />
        )}
      </main>
      <DanceEngineFooter />
    </div>
  );
}
