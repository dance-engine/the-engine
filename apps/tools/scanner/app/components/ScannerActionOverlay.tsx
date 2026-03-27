import type { TicketRecord } from "../types/scanner";

type ScannerAction = "check" | "mark-used" | "reset-unused";

type ScannerActionOverlayProps = {
  open: boolean;
  ticket: TicketRecord | null;
  submitting: boolean;
  selectedOrg: string;
  onAction: (action: ScannerAction) => void;
  onScanNext: () => void;
};

export default function ScannerActionOverlay({
  open,
  ticket,
  submitting,
  selectedOrg,
  onAction,
  onScanNext,
}: ScannerActionOverlayProps) {
  if (!open || !ticket) {
    return null;
  }

  const orgMismatch = ticket.orgMismatch ?? false;
  const actionsDisabled = submitting || orgMismatch;

  return (
    <div className="fixed inset-0 z-50 absolute h-screen w-screen flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <section className="w-full max-w-md rounded-2xl border border-dark-outline bg-white/95 p-4 shadow-2xl">
        {orgMismatch && (
          <div className="mb-3 rounded-xl border border-red-300 bg-red-50 px-4 py-3">
            <p className="text-sm font-semibold text-red-700">⚠ Organisation mismatch</p>
            <p className="mt-1 text-xs text-red-600">
              This ticket belongs to{" "}
              <span className="font-mono font-bold">{ticket.jwtOrg ?? "an unknown org"}</span>, but you
              are scanning for{" "}
              <span className="font-mono font-bold">{selectedOrg}</span>. Actions are disabled.
            </p>
          </div>
        )}
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-base font-semibold text-dark-background">Ticket Result</h2>
          <button
            type="button"
            onClick={onScanNext}
            className="rounded-lg border border-dark-outline px-3 py-1.5 text-xs font-semibold text-dark-background hover:bg-slate-100"
          >
            Scan Next
          </button>
        </div>

        <div className="mt-3 grid gap-2 text-sm text-slate-700">
          <p>
            <span className="font-semibold">Attendee:</span> {ticket.attendeeName}
          </p>
          <p>
            <span className="font-semibold">Ticket:</span> {ticket.ticketId}
          </p>
          <p>
            <span className="font-semibold">Event:</span> {ticket.eventName}
          </p>
          <p>
            <span className="font-semibold">Selected Organisation:</span>{" "}
            <span className="font-mono">{selectedOrg || "Not selected"}</span>
          </p>
          <p>
            <span className="font-semibold">JWT Organisation:</span>{" "}
            <span className="font-mono">{ticket.jwtOrg ?? "Not present"}</span>
          </p>
          <p>
            <span className="font-semibold">Scanned At:</span> {new Date(ticket.scannedAt).toLocaleString()}
          </p>
          <p>
            <span className="font-semibold">Status:</span>{" "}
            <span
              className={
                ticket.status === "used"
                  ? "rounded-full bg-cerise-logo px-3 py-1 text-xs font-bold uppercase text-white"
                  : "rounded-full bg-keppel-logo px-3 py-1 text-xs font-bold uppercase text-white"
              }
            >
              {ticket.status}
            </span>
          </p>
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Decoded JWT payload</p>
          <pre className="mt-2 max-h-48 overflow-auto rounded bg-slate-900 p-2 text-xs text-slate-100">
            {JSON.stringify(ticket.jwtPayload ?? {}, null, 2)}
          </pre>

          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-600">JWT header</p>
          <pre className="mt-2 max-h-32 overflow-auto rounded bg-slate-900 p-2 text-xs text-slate-100">
            {JSON.stringify(ticket.jwtHeader ?? {}, null, 2)}
          </pre>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onAction("check")}
            disabled={actionsDisabled}
            className="rounded-lg bg-keppel-logo px-3 py-2 text-sm font-semibold text-white hover:bg-keppel-on-light disabled:cursor-not-allowed disabled:opacity-60"
          >
            Check
          </button>
          <button
            type="button"
            onClick={() => onAction("mark-used")}
            disabled={actionsDisabled}
            className="rounded-lg bg-cerise-logo px-3 py-2 text-sm font-semibold text-white hover:bg-cerise-on-light disabled:cursor-not-allowed disabled:opacity-60"
          >
            Mark Used
          </button>
          <button
            type="button"
            onClick={() => onAction("reset-unused")}
            disabled={actionsDisabled}
            className="col-span-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Reset to Unused
          </button>
        </div>
      </section>
    </div>
  );
}