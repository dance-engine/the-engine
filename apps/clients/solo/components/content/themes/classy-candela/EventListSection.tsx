import type { CSSProperties } from "react";
import EventList from "@/components/EventList";
import { getPublicEvents } from "../default/EventListSection";
import PlainOrRichText from "../PlainOrRichText";
import type { SectionProps } from "../types";
import { goldRule, onDark } from "./styles";

// The shared events carousel on the dark background, under a serif italic heading and gold rule.
// The carousel's Prev/Next buttons use the primary colour, as they're clickable.
export default async function EventListSection({ section, organisation }: SectionProps<"eventListSection">) {
  const events = await getPublicEvents(organisation);

  return (
    <section
      className={`px-6 py-16 sm:px-10 ${onDark}`}
      style={{ "--highlight-color": "var(--org-color-primary)" } as CSSProperties}
    >
      {(section.heading || section.body) && (
        <div className="mx-auto mb-10 max-w-4xl text-center">
          {section.heading && <h2 className="text-4xl italic sm:text-5xl">{section.heading}</h2>}
          <span aria-hidden="true" className={`mx-auto mt-5 ${goldRule}`} />
          <PlainOrRichText value={section.body} className="mx-auto mt-5 max-w-2xl text-(--section-muted)" />
        </div>
      )}
      <EventList fallbackData={events} org={organisation} theme="content" />
    </section>
  );
}
