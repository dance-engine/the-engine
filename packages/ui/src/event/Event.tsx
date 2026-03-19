"use client";

import useSWR from "swr";
import dynamic from "next/dynamic";
import NextLink from "next/link";
import type { CSSProperties } from "react";
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
import { createEvent, EventModelType } from "@dance-engine/schemas/events";
import { OrganisationType } from "@dance-engine/schemas/organisation";
import { getOrganisationTheme } from "./lib/organisationTheme";
import EventHeroBanner from "./EventHeroBanner";
import EventFactsPanel from "./EventFactsPanel";
import EventTicketing from "./EventTicketing";
import EventFooter from "./EventFooter";
import DevThemeDebug from "./DevThemeDebug";

const MapDisplay = dynamic(() => import("../Map"), {
  loading: () => (
    <p
      className="flex h-[320px] items-center justify-center text-sm"
      style={{ color: "var(--scheme-surface-muted)" }}
    >
      Map loading
    </p>
  ),
  ssr: false,
});

const fetcher = (url: string) => fetch(url).then((res) => res.json());

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

const getDirectionsHref = (event: EventModelType) => {
  const destination =
    typeof event.location?.lat === "number" &&
    typeof event.location?.lng === "number"
      ? `${event.location.lat},${event.location.lng}`
      : event.location?.address || event.location?.name;

  if (!destination) {
    return undefined;
  }

  const encodedDestination = encodeURIComponent(destination);

  if (
    typeof navigator !== "undefined" &&
    /iPad|iPhone|iPod|Macintosh/i.test(navigator.userAgent)
  ) {
    return `https://maps.apple.com/?daddr=${encodedDestination}`;
  }

  return `https://www.google.com/maps/dir/?api=1&destination=${encodedDestination}`;
};

export default function Event({
  fallbackData,
  org,
  eventKsuid,
}: {
  fallbackData: unknown;
  org: OrganisationType;
  eventKsuid: string;
}) {
  const {
    data: eventData,
    isLoading,
    error,
  } = useSWR(
    `${process.env.NEXT_PUBLIC_DANCE_ENGINE_API}/public/${org.organisation}/events/${eventKsuid}`,
    fetcher,
    { fallbackData },
  );

  if (isLoading || !eventKsuid) {
    return (
      <p
        className="px-4 py-16 text-sm"
        style={{ color: "var(--scheme-page-text-muted)" }}
      >
        Loading...
      </p>
    );
  }

  if (error) {
    return (
      <p
        className="px-4 py-16 text-sm"
        style={{ color: "var(--scheme-page-text-muted)" }}
      >
        Unable to load this event right now.
      </p>
    );
  }

  if (eventData?.events && eventData.events.length > 1) {
    return (
      <p
        className="px-4 py-16 text-sm"
        style={{ color: "var(--scheme-page-text-muted)" }}
      >
        Multiple events matched this URL.
      </p>
    );
  }

  if (!eventData?.event) {
    return (
      <div className="px-4 py-16" style={{ color: "var(--scheme-page-text)" }}>
        <h1 className="text-xl font-semibold">Event Missing?</h1>
        <p
          className="mt-3 text-sm"
          style={{ color: "var(--scheme-page-text-muted)" }}
        >
          No event was found for this URL. Try the{" "}
          <NextLink className="underline cursor-pointer" href="/">
            main site
          </NextLink>{" "}
          to find the current link.
        </p>
      </div>
    );
  }

  const event = createEvent(eventData.event);
  const organisationTheme = getOrganisationTheme(org);
  const startDate = event.starts_at ? new Date(event.starts_at) : undefined;
  const endDate = event.ends_at ? new Date(event.ends_at) : undefined;
  const highlightPassLabel = getHighlightBundleLabel(event);
  const directionsHref = getDirectionsHref(event);
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
    <div className="w-full">
      <style dangerouslySetInnerHTML={{ __html: organisationTheme.cssText }} />
      <div
        className="min-h-screen"
        style={{
          backgroundColor: "var(--scheme-page-bg-start)",
          color: "var(--scheme-page-text)",
        }}
      >
        {process.env.NODE_ENV === "development" ? (
          <DevThemeDebug theme={organisationTheme} />
        ) : null}
        <EventHeroBanner event={event} org={org} theme={organisationTheme} />
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

              {typeof event.location?.lat === "number" &&
              typeof event.location?.lng === "number" ? (
                <MapDisplay lat={event.location.lat} lng={event.location.lng} />
              ) : (
                <div
                  className="flex h-[320px] items-center justify-center text-sm"
                  style={{ color: "var(--scheme-surface-muted)" }}
                >
                  Venue map unavailable
                </div>
              )}

              <div className="px-3 pt-5">
                {directionsHref ? (
                  <a
                    href={directionsHref}
                    target="_blank"
                    rel="noreferrer"
                    className="cursor-pointer text-sm font-semibold underline underline-offset-4"
                    style={{ color: "var(--highlight-color)" }}
                  >
                    Get directions
                  </a>
                ) : (
                  <p
                    className="text-sm"
                    style={{ color: "var(--scheme-surface-muted)" }}
                  >
                    Directions will appear once a venue location is available.
                  </p>
                )}
              </div>
            </div>
          </section>
        </main>

        {/* <EventFooter org={org} theme={organisationTheme} /> */}
      </div>
    </div>
  );
}
