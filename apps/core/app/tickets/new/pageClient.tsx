'use client'

import { useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import useClerkSWR, { CorsError } from "@dance-engine/utils/clerkSWR";
import { useOrgContext } from "@dance-engine/utils/OrgContext";
import Spinner from "@dance-engine/ui/general/Spinner";
import { IoArrowBack, IoCloudOffline } from "react-icons/io5";
import { CustomerType } from "@dance-engine/schemas/customer";
import { EventResponseType } from "@dance-engine/schemas/events";
import { BundleTypeExtended, ItemType } from "@dance-engine/schemas/bundle";
import BuilderCard from "../../components/BuilderCard";
import SearchableEntityPicker, { SearchableEntityOption } from "../../components/SearchableEntityPicker";
import TicketDetailsFormCard, { TicketDraftFormValues } from "../../components/TicketDetailsFormCard";
import InventorySelectorCard from "../../components/InventorySelectorCard";
import TicketCreationSummaryCard from "../../components/TicketCreationSummaryCard";
import { buildIncludeSelection } from "../../components/includeSelection";

interface TicketCreatePageClientProps {
  draftKsuid: string;
  initialEventKsuid?: string;
  initialCustomerEmail?: string;
  initialNameOnTicket?: string;
  returnTo?: string;
}

const PageClient = ({
  draftKsuid,
  initialEventKsuid,
  initialCustomerEmail,
  initialNameOnTicket,
  returnTo,
}: TicketCreatePageClientProps) => {
  const { activeOrg } = useOrgContext();
  const { getToken } = useAuth();
  const [selectedEventKsuid, setSelectedEventKsuid] = useState(initialEventKsuid || "");
  const [eventQuery, setEventQuery] = useState("");
  const [requestedBundleIds, setRequestedBundleIds] = useState<string[]>([]);
  const [requestedItemIds, setRequestedItemIds] = useState<string[]>([]);
  const [submitMessage, setSubmitMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ticketValues, setTicketValues] = useState<TicketDraftFormValues>({
    name_on_ticket: initialNameOnTicket || "",
    customer_email: initialCustomerEmail || "",
    financial_status: "paid",
  });

  const eventsUrl = `${process.env.NEXT_PUBLIC_DANCE_ENGINE_API}/{org}/events`;
  const customersUrl = `${process.env.NEXT_PUBLIC_DANCE_ENGINE_API}/{org}/customers`;
  const eventInventoryUrl = `${process.env.NEXT_PUBLIC_DANCE_ENGINE_API}/{org}/events/${selectedEventKsuid}`;

  const { data: eventsData, error: eventsError, isLoading: isEventsLoading } = useClerkSWR(
    activeOrg ? eventsUrl.replace('/{org}', `/${activeOrg}`) : null,
    { suspense: false },
  );
  const { data: customersData, error: customersError, isLoading: isCustomersLoading } = useClerkSWR(
    activeOrg ? customersUrl.replace('/{org}', `/${activeOrg}`) : null,
    { suspense: false },
  );
  const { data: eventInventoryData, error: eventInventoryError, isLoading: isEventInventoryLoading } = useClerkSWR(
    activeOrg && selectedEventKsuid ? eventInventoryUrl.replace('/{org}', `/${activeOrg}`) : null,
    { suspense: false },
  );

  const events = useMemo(() => {
    const source = Array.isArray(eventsData?.events)
      ? eventsData.events
      : eventsData?.events && typeof eventsData.events === "object"
        ? Object.values(eventsData.events)
        : [];
    return source as EventResponseType[];
  }, [eventsData]);

  const customers = useMemo(() => {
    const source = Array.isArray(customersData?.customers)
      ? customersData.customers
      : customersData?.customers && typeof customersData.customers === "object"
        ? Object.values(customersData.customers)
        : [];
    return source as CustomerType[];
  }, [customersData]);

  const selectedEvent = useMemo(
    () => events.find((event) => event.ksuid === selectedEventKsuid),
    [events, selectedEventKsuid],
  );

  const selectedCustomer = useMemo(
    () => customers.find((customer) => customer.email.toLowerCase() === ticketValues.customer_email.trim().toLowerCase()),
    [customers, ticketValues.customer_email],
  );

  const availableBundles = useMemo(() => {
    const source = eventInventoryData?.event?.bundles;
    if (Array.isArray(source)) return source as BundleTypeExtended[];
    if (source && typeof source === "object") return Object.values(source) as BundleTypeExtended[];
    return [];
  }, [eventInventoryData]);

  const availableItems = useMemo(() => {
    const source = eventInventoryData?.event?.items;
    if (Array.isArray(source)) return source as ItemType[];
    if (source && typeof source === "object") return Object.values(source) as ItemType[];
    return [];
  }, [eventInventoryData]);

  const eventOptions = useMemo<SearchableEntityOption<EventResponseType>[]>(
    () =>
      events.map((event) => ({
        key: event.ksuid || "",
        title: event.name || event.ksuid || "Untitled event",
        subtitle: event.starts_at ? new Date(event.starts_at).toLocaleString() : "No start date",
        caption: event.status || "draft",
        searchText: [event.name, event.ksuid, event.status].filter(Boolean).join(" "),
        value: event,
      })),
    [events],
  );

  const customerOptions = useMemo<SearchableEntityOption<CustomerType>[]>(
    () =>
      customers.map((customer) => ({
        key: customer.email,
        title: customer.email,
        subtitle: customer.name || "Unnamed customer",
        caption: customer.phone || "",
        searchText: [customer.name, customer.email, customer.phone].filter(Boolean).join(" "),
        value: customer,
      })),
    [customers],
  );
  const backHref = returnTo && returnTo.startsWith("/") ? returnTo : "/customers";
  const backLabel = backHref.startsWith("/events/") ? "Back to tickets" : "Back to customer";

  const includeSelection = useMemo(
    () =>
      buildIncludeSelection({
        requestedBundleIds,
        requestedItemIds,
        bundles: availableBundles,
        items: availableItems,
      }),
    [availableBundles, availableItems, requestedBundleIds, requestedItemIds],
  );

  const selectedIncludeIds = useMemo(
    () => [...includeSelection.chosenBundleIds, ...includeSelection.chosenItemIds],
    [includeSelection.chosenBundleIds, includeSelection.chosenItemIds],
  );

  const ticketPayload = useMemo(
    () => ({
      ticket: {
        customer_email: ticketValues.customer_email,
        name_on_ticket: ticketValues.name_on_ticket,
        financial_status: ticketValues.financial_status,
        includes: selectedIncludeIds,
        ticket_creation_key: draftKsuid,
      },
    }),
    [draftKsuid, selectedIncludeIds, ticketValues],
  );

  const includeLabels = useMemo(
    () =>
      includeSelection.expandedIncludes.map((entry) => {
        const type = String(entry.entity_type || "").toLowerCase();
        const name = String(entry.name || entry.ksuid || "");
        return `${type}: ${name}`;
      }),
    [includeSelection.expandedIncludes],
  );

  const attendeeMatches = useMemo(() => {
    const query = ticketValues.name_on_ticket.trim().toLowerCase();
    if (!query || selectedCustomer || query.length < 2) return [];
    return customers.filter((customer) => String(customer.name || "").toLowerCase().includes(query)).slice(0, 3);
  }, [customers, selectedCustomer, ticketValues.name_on_ticket]);

  const canCreateTicket =
    Boolean(selectedEventKsuid) &&
    Boolean(ticketValues.customer_email.trim()) &&
    Boolean(ticketValues.name_on_ticket.trim()) &&
    includeSelection.includeKeys.length > 0;

  const handleTicketValueChange = <K extends keyof TicketDraftFormValues>(
    field: K,
    value: TicketDraftFormValues[K],
  ) => {
    setTicketValues((currentValues) => ({
      ...currentValues,
      [field]: value,
    }));
  };

  const handleSelectCustomer = (option: SearchableEntityOption<CustomerType>) => {
    handleTicketValueChange("customer_email", option.value.email);
    handleTicketValueChange("name_on_ticket", option.value.name || "");
  };

  const handleToggleBundle = (bundle: BundleTypeExtended) => {
    setRequestedBundleIds((currentIds) =>
      currentIds.includes(bundle.ksuid)
        ? currentIds.filter((bundleId) => bundleId !== bundle.ksuid)
        : [...currentIds, bundle.ksuid],
    );
  };

  const handleToggleItem = (item: ItemType) => {
    setRequestedItemIds((currentIds) =>
      currentIds.includes(item.ksuid)
        ? currentIds.filter((itemId) => itemId !== item.ksuid)
        : [...currentIds, item.ksuid],
    );
  };

  const handleCreateTicket = async () => {
    if (!canCreateTicket) {
      setSubmitMessage("Choose an event, enter an email address, add the attendee name, and select at least one include.");
      return;
    }

    setIsSubmitting(true);
    setSubmitMessage("");

    try {
      const endpoint = `${process.env.NEXT_PUBLIC_DANCE_ENGINE_API}/{org}/${selectedEventKsuid}/tickets`
        .replace('/{org}', `/${activeOrg}`);

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await getToken()}`,
        },
        body: JSON.stringify(ticketPayload),
      });

      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          typeof payload?.message === "string"
            ? payload.message
            : "We couldn't create the ticket right now.",
        );
      }

      setSubmitMessage(
        typeof payload?.message === "string"
          ? payload.message
          : "Ticket creation requested successfully.",
      );
      setTicketValues({
        name_on_ticket: "",
        customer_email: "",
        financial_status: "paid",
      });
      setRequestedBundleIds([]);
      setRequestedItemIds([]);
    } catch (error) {
      setSubmitMessage(
        error instanceof Error
          ? error.message
          : "We couldn't create the ticket right now.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!activeOrg) {
    return <div className="px-4 py-4 text-gray-600">No active organization selected</div>;
  }

  if (isEventsLoading || isCustomersLoading) {
    return (
      <div className="flex items-center gap-2 px-4 py-4 bg-pear-on-light text-gray-900 font-semibold w-full">
        <Spinner className="w-5 h-5" /> Loading ticket details…
      </div>
    );
  }

  if (eventsError || customersError) {
    const error = eventsError || customersError;
    return (
      <div className="flex items-center gap-2 px-4 py-4 bg-red-800 text-white w-full">
        <IoCloudOffline className="w-6 h-6" />
        {error instanceof CorsError ? "We couldn't load this page right now." : "We couldn't load this page right now."}
      </div>
    );
  }

  return (
    <div className="w-full px-4 lg:px-8 py-4 space-y-6">
      <div>
        <Link href={backHref} className="inline-flex items-center gap-2 text-sm font-medium text-dark-highlight hover:underline">
          <IoArrowBack className="h-4 w-4" /> {backLabel}
        </Link>
        <h1 className="mt-3 text-2xl font-bold text-gray-900">Create ticket</h1>
        <p className="mt-2 max-w-3xl text-sm text-gray-600">
          Create a ticket for an event and attendee in one place.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_360px]">
        <div className="space-y-6">
          <BuilderCard title="Event" description="Choose the event that this ticket will be for.">
            <SearchableEntityPicker
              label="Event"
              placeholder="Start typing to search"
              value={selectedEventKsuid && selectedEvent ? selectedEvent.name || eventQuery : eventQuery}
              options={eventOptions}
              selectedKey={selectedEventKsuid}
              onValueChange={(value) => {
                setEventQuery(value);
                if (!selectedEvent || value !== selectedEvent.name) {
                  setSelectedEventKsuid("");
                  setRequestedBundleIds([]);
                  setRequestedItemIds([]);
                }
              }}
              onSelect={(option) => {
                setSelectedEventKsuid(option.value.ksuid || "");
                setEventQuery(option.title);
              }}
              onClear={() => {
                setSelectedEventKsuid("");
                setEventQuery("");
                setRequestedBundleIds([]);
                setRequestedItemIds([]);
              }}
              emptyMessage="No events match that search."
              loading={isEventsLoading}
              errorMessage={
                eventsError
                  ? eventsError instanceof CorsError
                    ? "We couldn't load events right now."
                    : "We couldn't load events right now."
                  : undefined
              }
            />

            {selectedEvent ? (
              <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="grid gap-2 text-sm text-gray-900 sm:grid-cols-3 sm:gap-3">
                  <div>
                    {selectedEvent.starts_at
                      ? new Date(selectedEvent.starts_at).toLocaleDateString("en-GB")
                      : "Not set"}
                  </div>
                  <div>
                    {Array.isArray(selectedEvent.category) && selectedEvent.category.length > 0
                      ? selectedEvent.category.join(", ")
                      : "Not set"}
                  </div>
                  <div>{selectedEvent.status || "Not set"}</div>
                </div>
              </div>
            ) : null}
          </BuilderCard>

          <TicketDetailsFormCard
            draftKsuid={draftKsuid}
            values={ticketValues}
            onChange={handleTicketValueChange}
            customerOptions={customerOptions}
            onSelectCustomer={handleSelectCustomer}
            existingCustomerName={selectedCustomer?.name}
            existingCustomerEmail={selectedCustomer?.email}
            customerLabelAside={
              ticketValues.customer_email.trim()
                ? selectedCustomer
                  ? "Existing customer"
                  : "New customer will be created"
                : undefined
            }
            attendeeLabelAside={
              attendeeMatches.length > 0
                ? `Existing: ${attendeeMatches[0]?.name || attendeeMatches[0]?.email} (${attendeeMatches[0]?.email})`
                : undefined
            }
          />

          {eventInventoryError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {eventInventoryError instanceof CorsError
                ? "We couldn't load the available options right now."
                : "We couldn't load the available options right now."}
            </div>
          ) : null}

          {isEventInventoryLoading && selectedEventKsuid ? (
            <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-6 py-4 shadow-sm text-sm text-gray-600">
              <Spinner className="w-5 h-5" /> Loading available options…
            </div>
          ) : null}

          <InventorySelectorCard
            eventName={selectedEvent?.name}
            bundles={availableBundles}
            items={availableItems}
            selectedBundleIds={new Set(includeSelection.chosenBundleIds)}
            selectedItemIds={new Set(includeSelection.chosenItemIds)}
            includedItemIds={new Set(includeSelection.includedItemIds)}
            onToggleBundle={handleToggleBundle}
            onToggleItem={handleToggleItem}
          />
        </div>

        <div className="space-y-6 xl:sticky xl:top-24 xl:self-start">
          <TicketCreationSummaryCard
            selectedEvent={selectedEvent}
            selectedCustomer={selectedCustomer}
            customerEmail={ticketValues.customer_email}
            nameOnTicket={ticketValues.name_on_ticket}
            financialStatus={ticketValues.financial_status}
            includeCount={includeSelection.includeKeys.length}
            includeLabels={includeLabels}
            payload={ticketPayload}
            onCreateTicket={handleCreateTicket}
            isSubmitting={isSubmitting}
            canCreateTicket={canCreateTicket}
            statusMessage={submitMessage}
          />
        </div>
      </div>
    </div>
  );
};

export default PageClient;
