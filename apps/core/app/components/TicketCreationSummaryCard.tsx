'use client'

import type { CustomerType } from "@dance-engine/schemas/customer";
import type { EventResponseType } from "@dance-engine/schemas/events";
import Debug from "@dance-engine/ui/utils/Debug";
import BuilderCard from "./BuilderCard";

interface TicketCreationSummaryCardProps {
  selectedEvent?: EventResponseType;
  selectedCustomer?: CustomerType;
  customerEmail: string;
  nameOnTicket: string;
  financialStatus: string;
  includeCount: number;
  includeLabels: string[];
  payload: Record<string, unknown>;
  onCreateTicket: () => Promise<void> | void;
  isSubmitting: boolean;
  canCreateTicket: boolean;
  statusMessage?: string;
}

const TicketCreationSummaryCard = ({
  selectedEvent,
  selectedCustomer,
  customerEmail,
  nameOnTicket,
  financialStatus,
  includeCount,
  includeLabels,
  payload,
  onCreateTicket,
  isSubmitting,
  canCreateTicket,
  statusMessage,
}: TicketCreationSummaryCardProps) => {
  return (
    <BuilderCard
      title="Ready to create"
      description="Review the ticket details below, then create the ticket once everything looks right."
      footer={
        <button
          type="button"
          onClick={() => {
            void onCreateTicket();
          }}
          disabled={isSubmitting || !canCreateTicket}
          className="w-full rounded-md bg-dark-background px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-dark-highlight disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500 disabled:shadow-none"
        >
          {isSubmitting ? "Preparing payload…" : "Create ticket"}
        </button>
      }
    >
      <div className="relative">
        <Debug debug={payload} className="absolute right-0 top-0" />
      </div>

      <dl className="space-y-3">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Event</dt>
          <dd className="mt-1 text-sm text-gray-900">{selectedEvent?.name || "Not selected"}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Customer</dt>
          <dd className="mt-1 text-sm text-gray-900">{selectedCustomer?.name || customerEmail || "Not selected"}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Customer email</dt>
          <dd className="mt-1 text-sm text-gray-900">{customerEmail || "Not entered"}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Name on ticket</dt>
          <dd className="mt-1 text-sm text-gray-900">{nameOnTicket || "Not entered"}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Financial status</dt>
          <dd className="mt-1 text-sm text-gray-900">{financialStatus}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Defaults</dt>
          <dd className="mt-1 text-sm text-gray-900">ticket_status: active, admission_status: not_checked_in</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Included products</dt>
          <dd className="mt-1 text-sm text-gray-900">{includeCount}</dd>
        </div>
      </dl>

      {statusMessage ? (
        <div className="mt-4 rounded-md border border-keppel-on-light/20 bg-keppel-on-light/5 px-4 py-3 text-sm text-gray-700">
          {statusMessage}
        </div>
      ) : null}

      <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Confirmation</p>
        <div className="mt-3 space-y-2">
          {includeLabels.length > 0 ? (
            includeLabels.map((label) => (
              <p key={label} className="text-sm text-gray-700">
                {label}
              </p>
            ))
          ) : (
            <p className="text-sm text-gray-500">No bundles or items selected yet.</p>
          )}
        </div>
      </div>
    </BuilderCard>
  );
};

export default TicketCreationSummaryCard;
