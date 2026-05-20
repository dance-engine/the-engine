"use client";

import EventHeroBanner from "@dance-engine/ui/event/EventHeroBanner";
import { getOrganisationTheme } from "@dance-engine/ui/event/lib/organisationTheme";
import { createEvent } from "@dance-engine/schemas/events";
import type { OrganisationType } from "@dance-engine/schemas/organisation";
import MediaGalleryClient from "./MediaGalleryClient";

interface MediaGalleryPageClientProps {
  event: any; // raw event data
  org: OrganisationType;
  eventKsuid: string;
  orgSlug: string;
}

export default function MediaGalleryPageClient({ event, org, eventKsuid, orgSlug }: MediaGalleryPageClientProps) {
  const eventObj = event ? createEvent(event) : null;
  const organisationTheme = getOrganisationTheme(org);

  return (
    <div className="w-full" style={{ background: "var(--scheme-page-bg-start)", color: "var(--scheme-page-text)" }}>
      <style dangerouslySetInnerHTML={{ __html: organisationTheme.cssText }} />
      {eventObj && (
        <EventHeroBanner event={eventObj} org={org} theme={organisationTheme} />
      )}
      <div className="w-full max-w-7xl mx-auto px-4 py-8">
        <MediaGalleryClient eventKsuid={eventKsuid} orgSlug={orgSlug} />
      </div>
    </div>
  );
}
