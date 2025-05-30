import React from "react";
import PageClient from './pageClient'

const CustomerPage = async ({ params }: {params: Promise<{ ksuid: string }>}) => {  
  const {ksuid} = await params; // Extract ksuid if it exists, else null
  return (
    <div className="min-h-screen flex flex-col justify-start items-center px-2 sm:px-4 lg:px-8 ">
      <h1 className="text-2xl font-bold mb-4 w-full">New Customer</h1>
      <PageClient ksuid={ksuid}/>
    </div>
  );
};

export default CustomerPage;
