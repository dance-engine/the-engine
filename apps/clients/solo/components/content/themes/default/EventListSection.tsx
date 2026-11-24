import type { CSSProperties } from "react";
import EventList from "@/components/EventList";
import type { EventResponseType } from "@dance-engine/schemas/events";
import type { SectionProps } from "../types";

// The org's live events from Dance Engine: the same carousel as the legacy events page.
// Loaded on the server so the events are in the first render; EventList then refreshes them in the browser.
export default async function EventListSection({ section, organisation }: SectionProps<"eventListSection">) {
  const events = await getPublicEvents(organisation);

  return (
    <section
      className="bg-de-background-dark px-6 py-14 text-white sm:px-10"
      // EventList's Prev/Next buttons use --highlight-color; point it at the org's primary colour.
      style={{ "--highlight-color": "var(--org-color-primary)" } as CSSProperties}
    >
      {(section.heading || section.body) && (
        <div className="mx-auto mb-8 max-w-4xl text-center">
          {section.heading && <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{section.heading}</h2>}
          {section.body && <p className="mx-auto mt-4 max-w-2xl text-white/80">{section.body}</p>}
        </div>
      )}
      <EventList fallbackData={events} org={organisation} theme="content" />
    </section>
  );
}

// Same request as the legacy events page. EventList reads `.events` from this response, despite its prop type.
async function getPublicEvents(organisation: string): Promise<EventResponseType[]> {
  const fallback = { events: [] } as unknown as EventResponseType[];
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_DANCE_ENGINE_API}/public/${organisation}/events`, {
      next: { revalidate: 60 },
    });
    if (!response.ok) return fallback;
    return (await response.json()) as EventResponseType[];
  } catch {
    return fallback;
  }
}
