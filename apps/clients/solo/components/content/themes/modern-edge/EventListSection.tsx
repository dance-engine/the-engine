import type { CSSProperties } from "react";
import EventList from "@/components/EventList";
import { getPublicEvents } from "../default/EventListSection";
import type { SectionProps } from "../types";

// Same as the default events section, on the org's secondary colour instead of the dark navy.
// Only the Prev/Next buttons use the primary colour, as they're clickable.
export default async function EventListSection({ section, organisation }: SectionProps<"eventListSection">) {
  const events = await getPublicEvents(organisation);

  return (
    <section
      className="bg-(--org-color-secondary) px-6 py-14 text-(--org-color-secondary-text) sm:px-10"
      style={{ "--highlight-color": "var(--org-color-primary)" } as CSSProperties}
    >
      {(section.heading || section.body) && (
        <div className="mx-auto mb-8 max-w-4xl text-center">
          {section.heading && (
            <h2 className="text-3xl font-black uppercase tracking-tight sm:text-4xl">
              {section.heading}
            </h2>
          )}
          {section.body && <p className="mx-auto mt-4 max-w-2xl opacity-80">{section.body}</p>}
        </div>
      )}
      <EventList fallbackData={events} org={organisation} theme="content" />
    </section>
  );
}
