import React from "react";
import { LuCalendarPlus2 } from "react-icons/lu";
import Link from "next/link";
import PageBundlesClient from "./pageClient";

const EventBundlesPage = async ({ params }: { params: { ksuid: string } }) => {
  const { ksuid } = params;

  return (
    <div className="flex flex-col justify-start items-center relative">
      <div className="sm:flex sm:items-center w-full px-4 lg:px-8 pb-0">
        <div className="sm:flex-auto">
          <h1 className="text-base font-semibold text-gray-900">Bundles & Items</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage bundles and items for this event
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <Link 
            href={`/events/${ksuid}/bundles/new`}
            type="button"
            className="flex w-fit gap-1 items-center rounded-md bg-dark-background px-3 py-2 text-center text-sm font-semibold text-white shadow-xs hover:bg-dark-highlight focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dark-highlight"
          >
            <LuCalendarPlus2 className="w-6 h-6"/> Add Bundle
          </Link>
        </div>
      </div>
      <PageBundlesClient ksuid={ksuid} />
    </div>
  );
};

export default EventBundlesPage;
