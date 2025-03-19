import React from "react";
import { LuCalendarPlus2 } from "react-icons/lu";
import Link from "next/link";
import CachedEntities from '@dance-engine/ui/utils/CachedEntities'

const EventPage = async () => {  
  return (
    <div className="flex flex-col justify-start items-center relative">
      <h1 className="text-4xl font-bold mb-4 w-full leading-none">Events</h1>
      <Link href="/events/new" className="border bg-blue-600 text-white p-3 rounded-full absolute right-0 -top-5" aria-label="Add Event"><LuCalendarPlus2 className="w-6 h-6"/></Link>
      <CachedEntities entityType='EVENT' className="w-full"/>
    </div>
  );
};

export default EventPage;
