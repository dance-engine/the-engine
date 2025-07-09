import React from "react";
import OrgPageClient from './pageClient'

const OrgSettingsPage = () => {  
  return (
    <div className="min-h-screen flex flex-col justify-start items-center px-2 sm:px-4 lg:px-8 ">
      <h1 className="text-2xl font-bold mb-4 w-full">Organisation Settings</h1>
      <OrgPageClient/>
    </div>
  );
};

export default OrgSettingsPage;
