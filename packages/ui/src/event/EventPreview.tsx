"use client";

import { format } from "date-fns";
import { generateHTML } from "@tiptap/core";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import Bold from "@tiptap/extension-bold";
import Strike from "@tiptap/extension-strike";
import Italic from "@tiptap/extension-italic";
import Heading from "@tiptap/extension-heading";
import BulletedList from "@tiptap/extension-bullet-list";
import OrderedList from "@tiptap/extension-ordered-list";
import ListItem from "@tiptap/extension-list-item";
import { Link } from "@tiptap/extension-link";
import HardBreak from "@tiptap/extension-hard-break";
import type { CSSProperties } from "react";
import { EventModelType } from "@dance-engine/schemas/events";
import { OrganisationType } from "@dance-engine/schemas/organisation";
import EventFactsPanel from "./EventFactsPanel";
import EventFooter from "./EventFooter";
import EventHeroBanner from "./EventHeroBanner";
import EventTicketing from "./EventTicketing";
import { getOrganisationTheme } from "./lib/organisationTheme";

const PREVIEW_SCOPE = ".event-preview-root";

const sampleDescription = JSON.stringify({
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "A themed social weekend with classes, parties and a tidy checkout flow.",
        },
      ],
    },
    {
      type: "bulletList",
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Daytime workshops" }],
            },
          ],
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Evening social dancing" }],
            },
          ],
        },
      ],
    },
  ],
});

const sampleOrg: OrganisationType = {
  name: "Sample Dance Festival",
  organisation: "sample-dance-festival",
  description: "Preview organisation",
  account_id: "acct_preview",
  banner: "",
  banner_overlay: "",
  logo: "",
  logo_secondary_url: "",
  logo_icon_url: "",
  status: "active",
};

const sampleEvent = {
  entity_type: "EVENT",
  ksuid: "preview-event",
  name: "Spring Social Weekend",
  description: sampleDescription,
  banner: "",
  starts_at: "2026-04-02T14:00:00.000Z",
  ends_at: "2026-04-02T23:30:00.000Z",
  category: ["workshop", "party"],
  capacity: 250,
  status: "live",
  location: {
    entity_type: "LOCATION",
    ksuid: "preview-location",
    name: "Wellington Rooms",
    address: "Mount Pleasant\nLiverpool",
    lat: 53.4038,
    lng: 2.9706,
  },
  meta: {
    highlight_bundle_ksuid: "preview-full-pass",
  },
  bundles: [
    {
      ksuid: "preview-full-pass",
      entity_type: "BUNDLE",
      parent_event_ksuid: "preview-event",
      name: "Full Pass",
      description: "Best value access to the full event.",
      includes: ["preview-class", "preview-party"],
      primary_price: 6500,
      primary_price_name: "Standard",
      secondary_price: 5200,
      secondary_price_name: "Student",
      status: "live",
    },
  ],
  items: {
    "preview-class": {
      ksuid: "preview-class",
      entity_type: "ITEM",
      parent_event_ksuid: "preview-event",
      name: "Workshop Ticket",
      description: "Access to the daytime workshops.",
      primary_price: 2800,
      primary_price_name: "Standard",
      secondary_price: 2200,
      secondary_price_name: "Student",
      status: "live",
    },
    "preview-party": {
      ksuid: "preview-party",
      entity_type: "ITEM",
      parent_event_ksuid: "preview-event",
      name: "Party Ticket",
      description: "Entry to the evening social and performances.",
      primary_price: 1800,
      primary_price_name: "Standard",
      secondary_price: 1400,
      secondary_price_name: "Student",
      status: "live",
    },
  },
} as EventModelType;

const getScopedThemeCss = (cssText: string) =>
  cssText.replaceAll(":root", PREVIEW_SCOPE);

const getPreviewOrg = (theme: Record<string, string>) =>
  ({
    ...sampleOrg,
    theme,
  }) as OrganisationType;

const getHighlightBundleLabel = (event: EventModelType) => {
  const highlightBundleKsuid =
    typeof event.meta?.highlight_bundle_ksuid === "string"
      ? event.meta.highlight_bundle_ksuid
      : undefined;

  return (
    event.bundles?.find((bundle) => bundle.ksuid === highlightBundleKsuid)
      ?.name || "Tickets"
  );
};

export default function EventPreview({
  theme,
  mode,
}: {
  theme: Record<string, string>;
  mode: "light" | "dark";
}) {
  const org = getPreviewOrg(theme);
  const organisationTheme = getOrganisationTheme(org);
  const scopedCss = getScopedThemeCss(organisationTheme.cssText);
  const event = sampleEvent;
  const startDate = event.starts_at ? new Date(event.starts_at) : undefined;
  const endDate = event.ends_at ? new Date(event.ends_at) : undefined;
  const highlightPassLabel = getHighlightBundleLabel(event);
  const eventDescription = event.description
    ? generateHTML(JSON.parse(event.description), [
        Document,
        Paragraph,
        Text,
        Bold,
        Strike,
        Italic,
        Heading,
        ListItem,
        BulletedList,
        OrderedList,
        Link,
        HardBreak,
      ])
    : "";

  return (
    <div className="h-full overflow-y-auto bg-gray-100">
      <style dangerouslySetInnerHTML={{ __html: scopedCss }} />
      <div className="px-4 py-4">
        <div
          className="event-preview-root origin-top overflow-hidden rounded-2xl border border-gray-200 shadow-sm select-none"
          data-dev-color-scheme={mode}
          style={{
            width: "128%",
            transform: "scale(0.78)",
            transformOrigin: "top left",
          }}
        >
          <div
            className="pointer-events-none min-h-screen"
            style={{
              backgroundColor: "var(--scheme-page-bg-start)",
              color: "var(--scheme-page-text)",
            }}
          >
            <EventHeroBanner
              event={event}
              org={org}
              theme={organisationTheme}
            />
            <EventFactsPanel
              event={event}
              highlightedPassLabel={highlightPassLabel}
            />

            <main className="mx-auto mt-10 w-full max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
              <EventTicketing event={event} org={org} />

              <section className="mt-8 grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
                <div
                  className="p-6"
                  style={{ color: "var(--scheme-surface-text)" }}
                >
                  <p
                    className="text-xs font-semibold uppercase tracking-[0.28em]"
                    style={{ color: "var(--scheme-surface-muted)" }}
                  >
                    About this event
                  </p>
                  <h2 className="mt-2 text-3xl font-black tracking-tight">
                    What you&apos;re booking
                  </h2>
                  <div
                    className="prose mt-6 max-w-none prose-headings:font-black"
                    style={
                      {
                        color: "var(--scheme-surface-text)",
                        "--tw-prose-body": "var(--scheme-surface-text)",
                        "--tw-prose-headings": "var(--scheme-prose-strong)",
                        "--tw-prose-links": "var(--scheme-prose-links)",
                        "--tw-prose-bold": "var(--scheme-prose-strong)",
                        "--tw-prose-bullets": "var(--highlight-color)",
                        "--tw-prose-counters": "var(--scheme-surface-muted)",
                      } as CSSProperties
                    }
                    dangerouslySetInnerHTML={{ __html: eventDescription }}
                  />
                  <div className="mt-8 px-5 py-4">
                    <p
                      className="text-xs font-semibold uppercase tracking-[0.24em]"
                      style={{ color: "var(--scheme-surface-muted)" }}
                    >
                      Schedule
                    </p>
                    <p className="mt-2 text-lg font-semibold">
                      {startDate
                        ? format(startDate, "EEEE d MMMM yyyy, h:mmaaa")
                        : "Date TBC"}
                    </p>
                    {endDate ? (
                      <p
                        className="text-sm"
                        style={{ color: "var(--scheme-surface-muted)" }}
                      >
                        Ends {format(endDate, "h:mmaaa")}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div
                  className="p-3"
                  style={{ color: "var(--scheme-surface-text)" }}
                >
                  <div className="px-3 pb-5">
                    <p
                      className="text-xs font-semibold uppercase tracking-[0.24em]"
                      style={{ color: "var(--scheme-surface-muted)" }}
                    >
                      Venue
                    </p>
                    <p className="mt-2 text-2xl font-black tracking-tight">
                      {event.location?.name || "Venue TBC"}
                    </p>
                    {event.location?.address ? (
                      <p
                        className="mt-2 whitespace-pre-line text-sm leading-6"
                        style={{ color: "var(--scheme-surface-muted)" }}
                      >
                        {event.location.address}
                      </p>
                    ) : null}
                  </div>

                  <div
                    className="flex h-[320px] items-center justify-center rounded-xl border"
                    style={{
                      color: "var(--scheme-surface-muted)",
                      borderColor: "var(--scheme-surface-border)",
                    }}
                  >
                    Map preview
                  </div>

                  <div className="px-3 pt-5">
                    <p
                      className="text-sm font-semibold underline underline-offset-4"
                      style={{ color: "var(--highlight-color)" }}
                    >
                      Get directions
                    </p>
                  </div>
                </div>
              </section>
            </main>

            <EventFooter org={org} theme={organisationTheme} />
          </div>
        </div>
      </div>
    </div>
  );
}
