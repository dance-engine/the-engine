'use client'
import { useEffect, useState } from "react";
import useClerkSWR from "@dance-engine/utils/clerkSWR";
import { useOrgContext } from "@dance-engine/utils/OrgContext";
import { useAuth } from "@clerk/nextjs";
import Spinner from "@dance-engine/ui/general/Spinner";
import { IoCloudOffline } from "react-icons/io5";
import { CorsError } from "@dance-engine/utils/clerkSWR";
import { TicketType } from "@dance-engine/schemas/ticket";
import dynamic from "next/dynamic";
import Link from "next/link";
import { IoEyeOutline, IoMailOutline } from "react-icons/io5";
import { useLayoutSearch } from "../../../components/LayoutSearchContext";
import { FaCheckCircle, FaRegCircle } from "react-icons/fa";

const BasicList = dynamic(() => import('@dance-engine/ui/list/BasicList'), {
  ssr: false,
});

interface TicketsClientProps {
  ksuid: string;
}

const PageTicketsClient = ({ ksuid }: TicketsClientProps) => {
  const { getToken } = useAuth();
  const { activeOrg } = useOrgContext();
  const { debouncedQuery, setRawQuery } = useLayoutSearch();
  const baseUrl = `${process.env.NEXT_PUBLIC_DANCE_ENGINE_API}/{org}/${ksuid}/tickets`;
  const ticketsUrl = baseUrl.replace('/{org}', activeOrg ? `/${activeOrg}` : '');
  const sendTicketsUrl = `${process.env.NEXT_PUBLIC_DANCE_ENGINE_API}/{org}/${ksuid}/tickets/send`;

  const { data: ticketsData, error, isLoading } = useClerkSWR(
    activeOrg ? ticketsUrl : null,
    { suspense: false }
  );

  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [resendingTicketKsuid, setResendingTicketKsuid] = useState<string | null>(null);
  const [resendStatus, setResendStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    const { tickets: eventTickets = [] } = ticketsData || {};
    setTickets(Array.isArray(eventTickets) ? eventTickets : Object.values(eventTickets || {}));
  }, [ticketsData]);

  const resendTicketEmail = async (ticketKsuid: string) => {
    if (!activeOrg || !ticketKsuid.trim()) {
      return;
    }

    try {
      setResendingTicketKsuid(ticketKsuid);
      setResendStatus(null);

      const token = await getToken();
      const endpoint = sendTicketsUrl.replace('/{org}', `/${activeOrg}`);

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ tickets: [ticketKsuid] }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof payload?.message === 'string'
            ? payload.message
            : 'Failed to resend ticket email.',
        );
      }

      setResendStatus({
        type: 'success',
        message: `Ticket email resend requested for ${ticketKsuid}.`,
      });
    } catch (error) {
      setResendStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to resend ticket email.',
      });
    } finally {
      setResendingTicketKsuid(null);
    }
  };

  if (!activeOrg) {
    return <div className="px-4 py-4 text-gray-600">No active organization selected</div>;
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-4 py-4 bg-pear-on-light text-gray-900 font-semibold w-full">
        <Spinner className="w-5 h-5" /> Loading event...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 px-4 py-4 bg-red-800 text-white w-full">
        <IoCloudOffline className="w-6 h-6" />
        {error instanceof CorsError ? "Failed to load event (CORS error)" : "Failed to load event"}
      </div>
    );
  }

  return (
    <div className="w-full space-y-8">
      {/* Tickets Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 px-4 lg:px-8">Tickets ({tickets.length})</h2>
        {resendStatus ? (
          <div
            className={`mx-4 rounded px-4 py-3 text-sm lg:mx-8 ${
              resendStatus.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {resendStatus.message}
          </div>
        ) : null}
        <BasicList 
          entity="TICKET"
          columns={["name_on_ticket", "customer_email", "name", "ticket_status", "financial_status", "admission_status"]}
          formats={[undefined, undefined, undefined]}
          columnValueAdapters={{
            admission_status: {
              displayValue: (value) => {
                const status = String(value ?? '')
                const isCheckedIn = status === 'checked_in'
                const label = isCheckedIn ? 'checked-in' : 'unused'

                return (
                  <span className="inline-flex items-center" title={label} aria-label={label}>
                    {isCheckedIn ? (
                      <FaCheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <FaRegCircle className="h-4 w-4 text-gray-400" />
                    )}
                    <span className="sr-only">{label}</span>
                  </span>
                )
              },
              searchText: (value) => {
                const status = String(value ?? '')
                if (status === 'checked_in') return 'checked-in checked in used admitted'
                if (status === 'not_checked_in') return 'unused unredeemed'
                if (status === 'denied') return 'denied rejected blocked'
                return status
              },
            },
          }}
          records={tickets as Record<string, unknown>[]}
          activeOrg={activeOrg || ''}
          parentKsuid={ksuid}
          parentEntityName="event"
          searchQuery={debouncedQuery}
          onClearSearch={() => setRawQuery('')}
          showEditAction={false}
          showDeleteAction={false}
          rowActions={(record) => (
            <>
              <button
                type="button"
                onClick={() => {
                  const ticketId = String(record.ksuid || '').trim();
                  if (ticketId) {
                    void resendTicketEmail(ticketId);
                  }
                }}
                disabled={resendingTicketKsuid === String(record.ksuid)}
                className="flex items-center justify-center gap-2 bg-keppel-on-light text-white px-1.5 py-1.5 rounded z-0 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Resend ticket"
                aria-label="Resend ticket"
              >
                <IoMailOutline className="h-5 w-5" />
                <span className="sr-only">Resend ticket</span>
              </button>
              <Link
                href={`/events/${ksuid}/tickets/${String(record.ksuid)}`}
                className="flex items-center justify-center gap-2 bg-keppel-on-light text-white px-1.5 py-1.5 rounded z-0"
              >
                <IoEyeOutline className="h-5 w-5" />
                <span className="sr-only">View ticket</span>
              </Link>
            </>
          )}
        />
      </div>
    </div>
  );
};

export default PageTicketsClient;
