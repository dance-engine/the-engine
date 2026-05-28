import React from "react";
import Link from "next/link";
import { LuCalendarPlus2 } from "react-icons/lu";
import PageListingClient from "../../components/PageListingClient";

const ArchivedEventsPage = async () => {
  return (
    <div className="flex flex-col justify-start items-center relative">
      <div className="sm:flex sm:items-center w-full px-4 lg:px-8 pb-0">
        <div className="sm:flex-auto">
          <h1 className="text-base font-semibold text-gray-900">Archived Events</h1>
          <p className="mt-2 text-sm text-gray-700">
            Events with archived status only.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <div className="flex items-center gap-3">
            <Link
              href="/events"
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-center text-sm font-semibold text-gray-900 shadow-xs hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dark-highlight"
            >
              Back to active events
            </Link>
            <Link
              href="/events/new"
              type="button"
              className="flex w-fit gap-1 items-center rounded-md bg-dark-background px-3 py-2 text-center text-sm font-semibold text-white shadow-xs hover:bg-dark-highlight focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dark-highlight"
            >
              <LuCalendarPlus2 className="w-6 h-6" /> Add Event
            </Link>
          </div>
        </div>
      </div>
      <PageListingClient
        entity={"EVENT"}
        archivedOnly
        includeArchived
        columns={["name", "starts_at", "starts_at", "ends_at", "category", "status", "number_sold", "meta.saved", "version"]}
        formats={[undefined, "date", "time", "time", undefined, undefined, undefined, "icon", undefined]}
      />
    </div>
  );
};

export default ArchivedEventsPage;