import React from "react";
import { LuCalendarPlus2 } from "react-icons/lu";
import Link from "next/link";

const EventPage = async () => {  
  return (
    <div className="min-h-screen flex flex-col justify-start items-center">
      <h1 className="text-2xl font-bold mb-4 w-full">Events</h1>
      <Link href="/events/new" className="border bg-gray-800 text-white p-3 rounded-full"><LuCalendarPlus2 className="w-6 h-6"/></Link>
    </div>
  );
};

export default EventPage;
