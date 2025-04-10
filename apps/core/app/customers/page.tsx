import React from "react";
import { LuCalendarPlus2 } from "react-icons/lu";
import Link from "next/link";
import PageListingClient from "../components/PageListingClient";

const CustomerPage = async () => {  
  return (
    <div className="flex flex-col justify-start items-center relative">
      <div className="sm:flex sm:items-center w-full px-4 lg:px-8 pb-0">
        <div className="sm:flex-auto">
          <h1 className="text-base font-semibold text-gray-900">Customers</h1>
          <p className="mt-2 text-sm text-gray-700">
            All existing customers, including those saved only on this device
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <Link 
            href="/customers/new"
            type="button"
            className="flex w-fit gap-1 items-center rounded-md bg-dark-background px-3 py-2 text-center text-sm font-semibold text-white shadow-xs hover:bg-dark-highlight focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dark-highlight"
          >
            <LuCalendarPlus2 className="w-6 h-6"/> Add Customer
          </Link>
        </div>
      </div>
      {/* <h1 className="text-4xl font-bold mb-4 w-full leading-none">Events</h1>
      <Link href="/events/new" className="border bg-blue-600 text-white p-3 rounded-full absolute right-0 -top-5" aria-label="Add Event"><LuCalendarPlus2 className="w-6 h-6"/></Link>
      <CachedEntities entityType='EVENT' className="w-full"/> */}
      <PageListingClient entity={"CUSTOMER"} columns={["name","meta.saved","version","meta.source"]} formats={[undefined,'icon',undefined,undefined]} />
    </div>
  );
};

export default CustomerPage;
