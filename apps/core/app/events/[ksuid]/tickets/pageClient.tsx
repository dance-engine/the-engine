'use client'
import { useEffect, useState } from "react";
import useClerkSWR from "@dance-engine/utils/clerkSWR";
import { useOrgContext } from "@dance-engine/utils/OrgContext";
import Spinner from "@dance-engine/ui/general/Spinner";
import { IoCloudOffline } from "react-icons/io5";
import { CorsError } from "@dance-engine/utils/clerkSWR";
import { TicketType } from "@dance-engine/schemas/ticket";
import dynamic from "next/dynamic";
import Link from "next/link";
import { IoEyeOutline } from "react-icons/io5";

const BasicList = dynamic(() => import('@dance-engine/ui/list/BasicList'), {
  ssr: false,
});

interface TicketsClientProps {
  ksuid: string;
}

const PageTicketsClient = ({ ksuid }: TicketsClientProps) => {
  const { activeOrg } = useOrgContext();
  const baseUrl = `${process.env.NEXT_PUBLIC_DANCE_ENGINE_API}/{org}/${ksuid}/tickets`;
  const ticketsUrl = baseUrl.replace('/{org}', activeOrg ? `/${activeOrg}` : '');

  const { data: ticketsData, error, isLoading } = useClerkSWR(
    activeOrg ? ticketsUrl : null,
    { suspense: false }
  );

  const [tickets, setTickets] = useState<TicketType[]>([]);

  useEffect(() => {
    const { tickets: eventTickets = [] } = ticketsData || {};
    setTickets(Array.isArray(eventTickets) ? eventTickets : Object.values(eventTickets || {}));
  }, [ticketsData]);

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
        <BasicList 
          entity="TICKET"
          columns={["name_on_ticket", "customer_email", "name", "ticket_status", "financial_status", "admission_status"]}
          formats={[undefined, undefined, undefined]}
          records={tickets as Record<string, unknown>[]}
          activeOrg={activeOrg || ''}
          parentKsuid={ksuid}
          parentEntityName="event"
          showEditAction={false}
          showDeleteAction={false}
          rowActions={(record) => (
            <Link
              href={`/events/${ksuid}/tickets/${String(record.ksuid)}`}
              className="flex items-center justify-center gap-2 bg-keppel-on-light text-white px-1.5 py-1.5 rounded z-0"
            >
              <IoEyeOutline className="h-5 w-5" />
              <span className="sr-only">View ticket</span>
            </Link>
          )}
        />
      </div>
    </div>
  );
};

export default PageTicketsClient;
