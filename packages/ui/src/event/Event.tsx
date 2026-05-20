"use client";

import useSWR from "swr";
import dynamic from "next/dynamic";
import NextLink from "next/link";
import type { CSSProperties } from "react";
import { format } from "date-fns";
import { Node, generateHTML, type JSONContent } from "@tiptap/core";
import { createEvent, EventModelType } from "@dance-engine/schemas/events";
import { OrganisationType } from "@dance-engine/schemas/organisation";
import { getOrganisationTheme } from "./lib/organisationTheme";
import {
  RICH_TEXT_ALLOWED_MARK_TYPES,
  RICH_TEXT_ALLOWED_NODE_TYPES,
  richTextRenderExtensions,
} from "../richText";
import EventHeroBanner from "./EventHeroBanner";
import EventFactsPanel from "./EventFactsPanel";
import EventTicketing from "./EventTicketing";
// import EventFooter from "./EventFooter";
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

const UnsupportedBlock = Node.create({
  name: "unsupportedBlock",
  group: "block",
  content: "inline*",
  addAttributes() {
    return {
      originalType: {
        default: null,
      },
    };
  },
  parseHTML() {
    return [{ tag: "div[data-unsupported-node]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      {
        ...HTMLAttributes,
        "data-unsupported-node": "true",
      },
      0,
    ];
  },
});

type RichTextMark = {
  type?: unknown;
  attrs?: Record<string, unknown>;
};

type RichTextNodeRaw = {
  type?: unknown;
  text?: unknown;
  attrs?: Record<string, unknown>;
  marks?: RichTextMark[];
  content?: RichTextNodeRaw[];
};

const ALLOWED_NODE_TYPES: Set<string> = new Set(
  RICH_TEXT_ALLOWED_NODE_TYPES as readonly string[],
);
const ALLOWED_MARK_TYPES: Set<string> = new Set(
  RICH_TEXT_ALLOWED_MARK_TYPES as readonly string[],
);
const INLINE_PARENT_TYPES = new Set(["paragraph", "heading"]);

const extractPlainText = (node: RichTextNodeRaw): string => {
  const fragments: string[] = [];

  if (typeof node.text === "string") {
    fragments.push(node.text);
  }

  if (Array.isArray(node.content)) {
    for (const child of node.content) {
      const childText = extractPlainText(child);
      if (childText) {
        fragments.push(childText);
      }
    }
  }

  return fragments.join(" ").trim();
};

const sanitizeLinkAttrs = (attrs?: Record<string, unknown>) => {
  if (!attrs) {
    return undefined;
  }

  const href = typeof attrs.href === "string" ? attrs.href : undefined;
  if (!href) {
    return undefined;
  }

  return {
    href,
    target: typeof attrs.target === "string" ? attrs.target : null,
    rel: typeof attrs.rel === "string" ? attrs.rel : null,
    class: typeof attrs.class === "string" ? attrs.class : null,
  };
};

const sanitizeMarks = (marks?: RichTextMark[]) => {
  if (!Array.isArray(marks)) {
    return undefined;
  }

  const sanitized = marks
    .map((mark) => {
      const markType = typeof mark?.type === "string" ? mark.type : undefined;
      if (!markType || !ALLOWED_MARK_TYPES.has(markType)) {
        return null;
      }

      if (markType === "link") {
        return {
          type: markType,
          attrs: sanitizeLinkAttrs(mark.attrs),
        };
      }

      return { type: markType };
    })
    .filter(Boolean);

  return sanitized.length > 0
    ? (sanitized as Array<{ type: string; attrs?: Record<string, unknown> }> )
    : undefined;
};

const sanitizeNode = (node: RichTextNodeRaw, parentType?: string): JSONContent[] => {
  const nodeType = typeof node?.type === "string" ? node.type : undefined;
  const sanitizedContent = Array.isArray(node?.content)
    ? node.content.flatMap((child) => sanitizeNode(child, nodeType))
    : undefined;

  if (!nodeType || !ALLOWED_NODE_TYPES.has(nodeType)) {
    const fallbackText = extractPlainText(node);

    if (parentType && INLINE_PARENT_TYPES.has(parentType)) {
      return fallbackText ? [{ type: "text", text: fallbackText }] : [];
    }

    if (fallbackText) {
      return [
        {
          type: "unsupportedBlock",
          attrs: { originalType: nodeType || "unknown" },
          content: [{ type: "text", text: fallbackText }],
        },
      ];
    }

    return sanitizedContent || [];
  }

  if (nodeType === "text") {
    const text = typeof node.text === "string" ? node.text : "";
    if (!text) {
      return [];
    }

    return [
      {
        type: "text",
        text,
        marks: sanitizeMarks(node.marks),
      },
    ];
  }

  const sanitizedNode: JSONContent = {
    type: nodeType,
  };

  if (nodeType === "heading") {
    const level =
      typeof node.attrs?.level === "number" && node.attrs.level >= 1 && node.attrs.level <= 6
        ? node.attrs.level
        : 2;
    sanitizedNode.attrs = { level };
  }

  if (sanitizedContent && sanitizedContent.length > 0) {
    sanitizedNode.content = sanitizedContent;
  }

  if (nodeType === "doc" && !sanitizedNode.content?.length) {
    sanitizedNode.content = [{ type: "paragraph", content: [] }];
  }

  return [sanitizedNode];
};

const safeGenerateEventDescriptionHtml = (description?: string) => {
  if (!description) {
    return "";
  }

  try {
    const parsed = JSON.parse(description) as RichTextNodeRaw;
    const [rootNode] = sanitizeNode(parsed);
    const sanitizedDoc: JSONContent =
      rootNode?.type === "doc" ? rootNode : { type: "doc", content: [] };

    return generateHTML(sanitizedDoc, [...richTextRenderExtensions, UnsupportedBlock]);
  } catch {
    return "";
  }
};

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
  org,
  eventKsuid,
}: {
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
  const eventDescription = safeGenerateEventDescriptionHtml(event.description);
  const debugEventState = process.env.NEXT_PUBLIC_EVENT_DEBUG === "true";
  const now = new Date();

  // If event has passed, show archive view
  // Some events contain inconsistent dates where ends_at is earlier than starts_at.
  // In that case, prefer starts_at so future events still show ticketing.
  const hasInconsistentDateRange =
    Boolean(startDate) && Boolean(endDate) && Boolean(endDate && startDate && endDate < startDate);
  const effectiveEndDate = hasInconsistentDateRange ? startDate : (endDate || startDate);
  const hasEventPassed = effectiveEndDate ? effectiveEndDate <= now : false;

  if (debugEventState && typeof window !== "undefined") {
    console.log("Event Debug:", {
      orgSlug: org.organisation,
      eventApiUrl: `${process.env.NEXT_PUBLIC_DANCE_ENGINE_API}/public/${org.organisation}/events/${eventKsuid}`,
      eventKsuid,
      eventName: event.name,
      starts_at_raw: event.starts_at,
      ends_at_raw: event.ends_at,
      startDate: startDate?.toISOString(),
      endDate: endDate?.toISOString(),
      hasInconsistentDateRange,
      effectiveEndDate: effectiveEndDate?.toISOString(),
      now: now.toISOString(),
      hasEventPassed,
    });
  }
  
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
          {hasEventPassed ? (
            <div className="w-full max-w-4xl px-4 py-12 mx-auto">
              <div
                className="text-center rounded-xl"
                style={{
                  background: "var(--highlight-color)",
                  color: "#fff",
                  padding: "2.5rem 2rem"
                }}
              >
                <h1 className="text-4xl font-bold mb-4" style={{ color: "#fff" }}>
                  Event Concluded
                </h1>
                <p className="text-lg mb-8" style={{ color: "#fff", opacity: 0.92 }}>
                  This event has already taken place. Check out photos from the event below.
                </p>
                <NextLink
                  href={`/${eventKsuid}/media`}
                  className="inline-block px-8 py-3 font-semibold rounded-lg transition-colors mb-12"
                  style={{
                    background: "#fff",
                    color: "var(--highlight-color)",
                  }}
                >
                  View Event Photos
                </NextLink>
              </div>
            </div>
          ) : (
            <>
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
                    className="prose mt-6 max-w-none prose-headings:font-black prose-li:mb-0 [&_li_p]:my-1 [&_mark]:bg-[var(--highlight-color)] [&_mark]:text-[var(--scheme-page-bg-start)]"
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
            </>
          )}
        </main>

        {/* <EventFooter org={org} theme={organisationTheme} /> */}
      </div>
    </div>
  );
}
