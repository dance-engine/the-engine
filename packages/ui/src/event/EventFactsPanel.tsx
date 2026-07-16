import Link from "next/link";
import { format } from "date-fns";
import { EventModelType } from "@dance-engine/schemas/events";
import { CalendarIcon, MapPinIcon, TicketIcon } from "./Icons";

const factCardClasses = "flex items-center gap-4 border p-5";

export default function EventFactsPanel({
  event,
  highlightedPassLabel,
  showBookingCta = true,
  bookingTargetId = "ticket-options",
  showWaitlistCta = false,
}: {
  event: EventModelType;
  highlightedPassLabel: string;
  showBookingCta?: boolean;
  bookingTargetId?: string;
  showWaitlistCta?: boolean;
}) {
  const startDate = event.starts_at ? new Date(event.starts_at) : undefined;
  const endDate = event.ends_at ? new Date(event.ends_at) : undefined;
  const start = startDate ? format(startDate, "EEEE d MMMM yyyy") : "Date TBC";
  const timeRange =
    startDate && endDate
      ? `${format(startDate, "h:mmaaa")} to ${format(endDate, "h:mmaaa")}`
      : startDate
        ? format(startDate, "h:mmaaa")
        : "Time TBC";

  return (
    <section className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
      <div
        className="grid gap-6 p-4 md:grid-cols-[1.5fr_0.8fr] md:p-6"
        style={{
          backgroundColor: "transparent",
          color: "var(--scheme-panel-text)",
        }}
      >
        <div className="grid gap-4">
          <div
            className={factCardClasses}
            style={{ borderColor: "transparent" }}
          >
            <div className="rounded-full bg-[var(--accent-color)] p-3 text-[var(--scheme-panel-text)]">
              <CalendarIcon className="h-8 w-8" />
            </div>
            <div>
              <p
                className="text-xs font-semibold uppercase tracking-[0.26em]"
                style={{ color: "var(--scheme-panel-muted)" }}
              >
                Date and time
              </p>
              <p className="mt-1 text-2xl font-semibold">{start}</p>
              <p className="text-lg">{timeRange}</p>
            </div>
          </div>

          <div
            className={factCardClasses}
            style={{ borderColor: "transparent" }}
          >
            <div className="rounded-full bg-[var(--accent-color)] p-3 text-[var(--scheme-panel-text)]">
              <MapPinIcon className="h-8 w-8" />
            </div>
            <div>
              <p
                className="text-xs font-semibold uppercase tracking-[0.26em]"
                style={{ color: "var(--scheme-panel-muted)" }}
              >
                Venue
              </p>
              <p className="mt-1 text-2xl font-semibold">
                {event.location?.name || "Venue TBC"}
              </p>
              {event.location?.address ? (
                <p
                  className="text-sm whitespace-pre-line"
                  style={{ color: "var(--scheme-panel-muted)" }}
                >
                  {event.location.address}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        {showBookingCta ? (
          <div className="hidden md:flex flex-col justify-start gap-3 p-5">
            <p
              className="text-xs font-semibold uppercase tracking-[0.28em]"
              style={{ color: "var(--scheme-panel-muted)" }}
            >
              Ready to book
            </p>
            <Link
              href={`#${bookingTargetId}`}
              className="inline-flex items-center justify-center gap-3 border px-5 py-4 text-base font-semibold transition"
              style={{
                backgroundColor: "var(--highlight-color)",
                borderColor: "var(--highlight-color)",
                color: "var(--scheme-action-text)",
              }}
            >
              <TicketIcon className="h-5 w-5" />
              {highlightedPassLabel}
            </Link>
          </div>
        ) : showWaitlistCta ? (
          <div className="flex p-5">
            <div
              className="w-full rounded-2xl border px-6 py-8"
              style={{
                borderColor:
                  "color-mix(in srgb, var(--scheme-panel-text) 20%, transparent)",
                backgroundColor:
                  "color-mix(in srgb, var(--accent-color) 10%, transparent)",
              }}
            >
              <p
                className="text-xs font-semibold uppercase tracking-[0.28em]"
                style={{ color: "var(--scheme-panel-muted)" }}
              >
                Waitlist
              </p>
              <h3 className="mt-2 text-2xl font-semibold">Tickets open soon</h3>
              <p
                className="mt-3 text-sm"
                style={{ color: "var(--scheme-panel-muted)" }}
              >
                Join the list and we will contact you as soon as tickets are live.
              </p>
              <Link
                href="/join"
                className="mt-6 inline-flex items-center justify-center rounded-lg px-5 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90"
                style={{
                  backgroundColor: "var(--highlight-color)",
                  color: "white",
                }}
              >
                Let me know when tickets are available
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
