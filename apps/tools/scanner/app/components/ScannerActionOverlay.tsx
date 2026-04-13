import type { TicketRecord } from "../types/scanner";
import { ImCross } from "react-icons/im";
import { MdError } from "react-icons/md";
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
  const backgroundColour = ticket.status === "used" ? "bg-red-700/70" : "bg-green-700/70";
  const organisations = Array.from(
    new Set(
      [selectedOrg, ticket.jwtOrg]
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  );
  const organisationText = organisations.join(" / ");

  return (
    <div className={`fixed inset-0 z-50 absolute h-screen w-screen flex flex-col items-center justify-center  ${backgroundColour} p-4 backdrop-blur-sm`}>

      <header className="w-full max-w-md rounded-t-2xl px-4 py-2 bg-slate-800 font-bold text-xl flex justify-between items-center text-white">
        <span className="flex gap-2 items-center">
        {ticket.name}
          <span
            className={
              ticket.status === "used"
                ? "rounded-sm bg-cerise-logo px-2 py-1 text-xs font-bold uppercase text-white"
                : "rounded-sm bg-keppel-logo px-2 py-1 text-xs font-bold uppercase text-white"
            }
          >
            {ticket.status}
          </span>
        </span>
           
        <button
          type="button"
          onClick={onScanNext}
          className="rounded-full flex items-center cursor-pointer justify-center w-10 h-10  text-xs  font-semibold text-light-background hover:bg-keppel-on-light hover:text-white hover:border-white"
        >
          <ImCross className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">Close Result Dialog</span>
        </button>
      </header>

      <section className="w-full max-w-md rounded-b-2xl border border-dark-outline bg-white/95 px-4 pt-2 pb-4 shadow-2xl relative">
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

        
       
        
        <div className="mt-3 grid gap-2 text-2xl text-slate-700">
          <p className="flex flex-col font-semibold">
            <span className="font-normal text-sm">Attendee:</span> {ticket.attendeeName}
          </p>
          <p className="flex flex-col font-semibold">
            <span className="font-normal text-sm">Email:</span> {ticket.customerEmail || "N/A"}
          </p>
          <p className="flex flex-col font-semibold">
            <span className="font-normal text-sm">Ticket #:</span> {ticket.ticketId}
          </p>
          <p className="flex flex-col font-semibold">
            <span className="font-normal text-sm">Event:</span> {ticket.eventName}
          </p>
          <p className="flex flex-col font-semibold">
            <span className="font-normal text-sm">Organisation:</span>{" "}
            <span className="font-mono">{organisationText || "Not selected"}</span>
            {organisations.length > 1 && (
              <><MdError className="inline-block ml-2 h-4 w-4 text-red-600" aria-hidden="true" />
              <span className="sr-only ml-2 rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-800">
                Mismatch
              </span>
              </>
            )}
          </p>
          <p>
            <span className="font-semibold">Scanned At:</span> {new Date(ticket.scannedAt).toLocaleString()}
          </p>
        </div>

        <div className="hidden mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
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
            onClick={onScanNext}
            disabled={actionsDisabled}
            className="rounded-lg border border-keppel-logo px-3 py-2 text-sm font-semibold text-keppel-logo hover:bg-keppel-on-light disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => { return ticket.status === "used" ? onAction("reset-unused") : onAction("mark-used")}}
            disabled={actionsDisabled}
            className={`rounded-lg ${ticket.status === "used" ? "bg-cerise-logo" : "bg-keppel-logo"} px-3 py-2 text-sm font-semibold text-white hover:bg-cerise-on-light disabled:cursor-not-allowed disabled:opacity-60`}
          >
            {ticket.status === "used" ? "Reset to Unused" : "Check-in"}
          </button>
          {/* <button
            type="button"
            onClick={() => onAction("reset-unused")}
            disabled={actionsDisabled}
            className="col-span-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Reset to Unused
          </button> */}
        </div>
      </section>
    </div>
  );
}