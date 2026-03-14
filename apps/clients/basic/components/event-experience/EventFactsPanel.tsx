import Link from "next/link";
import { format } from "date-fns";
import { EventModelType } from "@dance-engine/schemas/events";
import { CalendarIcon, MapPinIcon, TicketIcon } from "./Icons";

const factCardClasses = "flex items-start gap-4 border p-5";

export default function EventFactsPanel({
  event,
  highlightedPassLabel,
}: {
  event: EventModelType;
  highlightedPassLabel: string;
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
        style={{ backgroundColor: "transparent", color: "var(--scheme-panel-text)" }}
      >
        <div className="grid gap-4">
          <div className={factCardClasses} style={{ borderColor: "transparent" }}>
            <div
              className="p-3 text-[var(--highlight-color)]"
            >
              <CalendarIcon className="h-8 w-8" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.26em]" style={{ color: "var(--scheme-panel-muted)" }}>
                Date and time
              </p>
              <p className="mt-1 text-2xl font-semibold">{start}</p>
              <p className="text-lg">{timeRange}</p>
            </div>
          </div>

          <div className={factCardClasses} style={{ borderColor: "transparent" }}>
            <div
              className="p-3 text-[var(--highlight-color)]"
            >
              <MapPinIcon className="h-8 w-8" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.26em]" style={{ color: "var(--scheme-panel-muted)" }}>
                Venue
              </p>
              <p className="mt-1 text-2xl font-semibold">{event.location?.name || "Venue TBC"}</p>
              {event.location?.address ? (
                <p className="text-sm whitespace-pre-line" style={{ color: "var(--scheme-panel-muted)" }}>{event.location.address}</p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-center gap-3 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.28em]" style={{ color: "var(--scheme-panel-muted)" }}>
            Ready to book
          </p>
          <Link
            href="#ticket-options"
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
          <Link
            href="#checkout"
            className="inline-flex items-center justify-center border px-5 py-4 text-sm font-semibold transition"
            style={{ borderColor: "color-mix(in srgb, var(--scheme-panel-text) 26%, transparent)", backgroundColor: "transparent", color: "var(--scheme-panel-text)" }}
          >
            Another button
          </Link>
        </div>
      </div>
    </section>
  );
}
