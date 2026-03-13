import Link from "next/link";
import { format } from "date-fns";
import { EventModelType } from "@dance-engine/schemas/events";
import { CalendarIcon, MapPinIcon, TicketIcon } from "./Icons";

const factCardClasses =
  "flex items-start gap-4 rounded-[1.75rem] border p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08),inset_0_1px_0_rgba(255,255,255,0.8)] backdrop-blur";

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
    <section className="relative z-10 mx-auto -mt-10 w-full max-w-7xl px-4 sm:px-6 lg:px-8">
      <div
        className="grid gap-6 rounded-[2rem] border p-4 shadow-[0_25px_80px_rgba(9,16,30,0.16),inset_0_1px_0_rgba(255,255,255,0.7)] backdrop-blur-xl md:grid-cols-[1.5fr_0.8fr] md:p-6"
        style={{ borderColor: "var(--scheme-surface-border)", backgroundColor: "var(--scheme-surface-bg)" }}
      >
        <div className="grid gap-4">
          <div className={factCardClasses} style={{ borderColor: "var(--scheme-surface-border)", backgroundColor: "var(--scheme-surface-bg-strong)" }}>
            <div
              className="rounded-2xl p-3 text-[var(--highlight-color)]"
              style={{ backgroundColor: "var(--scheme-surface-bg-soft)" }}
            >
              <CalendarIcon className="h-6 w-6" />
            </div>
            <div style={{ color: "var(--scheme-surface-text)" }}>
              <p className="text-xs font-semibold uppercase tracking-[0.26em]" style={{ color: "var(--scheme-surface-muted)" }}>
                Date and time
              </p>
              <p className="mt-1 text-lg font-semibold">{start}</p>
              <p className="text-sm" style={{ color: "var(--scheme-surface-muted)" }}>{timeRange}</p>
            </div>
          </div>

          <div className={factCardClasses} style={{ borderColor: "var(--scheme-surface-border)", backgroundColor: "var(--scheme-surface-bg-strong)" }}>
            <div
              className="rounded-2xl p-3 text-[var(--highlight-color)]"
              style={{ backgroundColor: "var(--scheme-surface-bg-soft)" }}
            >
              <MapPinIcon className="h-6 w-6" />
            </div>
            <div style={{ color: "var(--scheme-surface-text)" }}>
              <p className="text-xs font-semibold uppercase tracking-[0.26em]" style={{ color: "var(--scheme-surface-muted)" }}>
                Venue
              </p>
              <p className="mt-1 text-lg font-semibold">{event.location?.name || "Venue TBC"}</p>
              {event.location?.address ? (
                <p className="text-sm whitespace-pre-line" style={{ color: "var(--scheme-surface-muted)" }}>{event.location.address}</p>
              ) : null}
            </div>
          </div>
        </div>

        <div
          className="flex flex-col justify-center gap-3 rounded-[1.75rem] border p-5 shadow-[0_24px_60px_rgba(7,12,24,0.35),inset_0_1px_0_rgba(255,255,255,0.08)]"
          style={{ borderColor: "var(--scheme-surface-border)", backgroundColor: "var(--scheme-panel-bg)", color: "var(--scheme-panel-text)" }}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.28em]" style={{ color: "var(--scheme-panel-muted)" }}>
            Ready to book
          </p>
          <Link
            href="#ticket-options"
            className="inline-flex items-center justify-center gap-3 rounded-2xl px-5 py-4 text-base font-semibold text-white shadow-[0_10px_25px_rgba(0,0,0,0.2)] transition hover:scale-[1.01]"
            style={{ backgroundColor: "var(--highlight-color)" }}
          >
            <TicketIcon className="h-5 w-5" />
            {highlightedPassLabel}
          </Link>
          <Link
            href="#checkout"
            className="inline-flex items-center justify-center rounded-2xl border px-5 py-4 text-sm font-semibold transition"
            style={{ borderColor: "var(--scheme-panel-muted)", backgroundColor: "var(--scheme-panel-bg-soft)", color: "var(--scheme-panel-text)" }}
          >
            Review order
          </Link>
        </div>
      </div>
    </section>
  );
}
