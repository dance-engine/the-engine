'use client'

import { CustomerType } from "@dance-engine/schemas/customer";
import BuilderCard from "./BuilderCard";
import SearchableEntityPicker, { SearchableEntityOption } from "./SearchableEntityPicker";

export type TicketDraftFormValues = {
  name_on_ticket: string;
  customer_email: string;
  financial_status: "paid" | "unpaid" | "partially_refunded" | "refunded" | "comp";
};

interface TicketDetailsFormCardProps {
  draftKsuid: string;
  values: TicketDraftFormValues;
  onChange: <K extends keyof TicketDraftFormValues>(field: K, value: TicketDraftFormValues[K]) => void;
  customerOptions: SearchableEntityOption<CustomerType>[];
  onSelectCustomer: (option: SearchableEntityOption<CustomerType>) => void;
  existingCustomerName?: string;
  existingCustomerEmail?: string;
  customerLabelAside?: string;
  attendeeLabelAside?: string;
}

const inputClassName =
  "mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 shadow-sm outline-none placeholder:text-gray-400 focus:border-dark-highlight";

const labelClassName = "text-sm font-medium text-gray-700";

const TicketDetailsFormCard = ({
  draftKsuid,
  values,
  onChange,
  customerOptions,
  onSelectCustomer,
  existingCustomerName,
  existingCustomerEmail,
  customerLabelAside,
  attendeeLabelAside,
}: TicketDetailsFormCardProps) => {
  return (
    <BuilderCard
      title="Ticket details"
      description="Enter the details of the attendee that this ticket is for. If no customer exists for the email you enter, a customer will be created."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <SearchableEntityPicker
            label="Customer email"
            labelAside={customerLabelAside}
            placeholder="Start typing to search"
            value={values.customer_email}
            options={customerOptions}
            selectedKey={existingCustomerEmail}
            onValueChange={(value) => onChange("customer_email", value)}
            onSelect={onSelectCustomer}
            emptyMessage="No customers match that search."
          />
          {values.customer_email.trim() ? (
            <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
              {existingCustomerEmail ? (
                <>
                  <p className="text-xs font-semibold uppercase tracking-wide text-keppel-on-light">Existing customer</p>
                  <p className="mt-1 text-sm text-gray-900">{existingCustomerName || existingCustomerEmail}</p>
                  <p className="mt-1 text-sm text-gray-600">{existingCustomerEmail}</p>
                </>
              ) : (
                <>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">New customer</p>
                  <p className="mt-1 text-sm text-gray-700">
                    No existing customer matches this email. The API can create one when the ticket is created.
                  </p>
                </>
              )}
            </div>
          ) : null}
        </div>

        <div className="sm:col-span-2">
          <div className="mb-1 flex items-center justify-between gap-3">
            <label className={labelClassName} htmlFor="name-on-ticket">
              Name of the attendee
            </label>
            {attendeeLabelAside ? <span className="text-xs text-gray-500">{attendeeLabelAside}</span> : null}
          </div>
          <input
            id="name-on-ticket"
            type="text"
            className={inputClassName}
            placeholder="Name printed on the ticket for check-in"
            value={values.name_on_ticket}
            onChange={(event) => onChange("name_on_ticket", event.target.value)}
          />
        </div>

        <div className="sm:col-span-2">
          <label className={labelClassName} htmlFor="financial-status">
            Financial status
          </label>
          <select
            id="financial-status"
            className={inputClassName}
            value={values.financial_status}
            onChange={(event) =>
              onChange("financial_status", event.target.value as TicketDraftFormValues["financial_status"])
            }
          >
            <option value="paid">paid</option>
            <option value="unpaid">unpaid</option>
            <option value="partially_refunded">partially_refunded</option>
            <option value="refunded">refunded</option>
            <option value="comp">comp</option>
          </select>
        </div>
      </div>
    </BuilderCard>
  );
};

export default TicketDetailsFormCard;
