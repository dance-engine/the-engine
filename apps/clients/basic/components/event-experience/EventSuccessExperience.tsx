'use client';

import Link from "next/link";
import { format } from "date-fns";
import { createEvent, EventType } from "@dance-engine/schemas/events";
import { OrganisationType } from "@dance-engine/schemas/organisation";
import { getOrganisationTheme } from "@/lib/organisationTheme";
import EventHeroBanner from "./EventHeroBanner";
import EventFooter from "./EventFooter";
import DevThemeDebug from "./DevThemeDebug";

const getEventFromResponse = (eventData: unknown) => {
  if (!eventData || typeof eventData !== "object") {
    return undefined;
  }

  const source = eventData as { event?: EventType; events?: EventType[] };
  const rawEvent = source.event || source.events?.[0];

  return rawEvent ? createEvent(rawEvent) : undefined;
};

export default function EventSuccessExperience({
  eventData,
  org,
  eventKsuid,
}: {
  eventData: unknown;
  org: OrganisationType;
  eventKsuid: string;
}) {
  const theme = getOrganisationTheme(org);
  const event = getEventFromResponse(eventData);
  const startDate = event?.starts_at ? new Date(event.starts_at) : undefined;
  const endDate = event?.ends_at ? new Date(event.ends_at) : undefined;

  return (
    <div className="w-full">
      <style dangerouslySetInnerHTML={{ __html: theme.cssText }} />
      <div
        className="min-h-screen"
        style={{
          backgroundColor: "var(--scheme-page-bg-start)",
          color: "var(--scheme-page-text)",
        }}
      >
        {process.env.NODE_ENV === "development" ? <DevThemeDebug theme={theme} /> : null}
        {event ? <EventHeroBanner event={event} org={org} theme={theme} /> : null}

        <main className="mx-auto mt-10 w-full max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
          <section className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="p-6" style={{ color: "var(--scheme-surface-text)" }}>
              <p className="text-xs font-semibold uppercase tracking-[0.28em]" style={{ color: "var(--highlight-color)" }}>
                Purchase complete
              </p>
              <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">
                Your order has been confirmed
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8" style={{ color: "var(--scheme-surface-text)" }}>
                Thanks for booking with {org.name}. Your transaction was successful and your ticket details will be sent to the email address you entered at checkout.
              </p>
              <p className="mt-4 max-w-2xl text-base leading-7" style={{ color: "var(--scheme-surface-muted)" }}>
                If the email does not arrive shortly, check your spam folder first. You can also keep this page handy as a reminder of the event details below.
              </p>

              <div className="mt-8 flex flex-wrap gap-4">
                <Link
                  href={`/${eventKsuid}`}
                  className="inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold transition"
                  style={{
                    backgroundColor: "var(--highlight-color)",
                    color: "var(--scheme-action-text)",
                  }}
                >
                  Back to event
                </Link>
                <Link
                  href="/"
                  className="inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold transition"
                  style={{
                    color: "var(--scheme-surface-text)",
                    outline: "1px solid color-mix(in srgb, var(--scheme-surface-text) 16%, transparent)",
                  }}
                >
                  Continue browsing
                </Link>
              </div>
            </div>

            <aside className="p-6" style={{ color: "var(--scheme-surface-text)" }}>
              <p className="text-xs font-semibold uppercase tracking-[0.28em]" style={{ color: "var(--scheme-surface-muted)" }}>
                Event details
              </p>
              <div className="mt-6 space-y-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: "var(--scheme-surface-muted)" }}>
                    Event
                  </p>
                  <p className="mt-2 text-2xl font-black tracking-tight">
                    {event?.name || "Your booked event"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: "var(--scheme-surface-muted)" }}>
                    Date and time
                  </p>
                  <p className="mt-2 text-base font-semibold">
                    {startDate ? format(startDate, "EEEE d MMMM yyyy") : "Date TBC"}
                  </p>
                  <p className="mt-1 text-sm" style={{ color: "var(--scheme-surface-muted)" }}>
                    {startDate && endDate
                      ? `${format(startDate, "h:mmaaa")} to ${format(endDate, "h:mmaaa")}`
                      : startDate
                        ? format(startDate, "h:mmaaa")
                        : "Time TBC"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: "var(--scheme-surface-muted)" }}>
                    Venue
                  </p>
                  <p className="mt-2 text-base font-semibold">
                    {event?.location?.name || "Venue TBC"}
                  </p>
                  {event?.location?.address ? (
                    <p className="mt-1 whitespace-pre-line text-sm" style={{ color: "var(--scheme-surface-muted)" }}>
                      {event.location.address}
                    </p>
                  ) : null}
                </div>
              </div>
            </aside>
          </section>
        </main>

        <EventFooter org={org} theme={theme} />
      </div>
    </div>
  );
}
