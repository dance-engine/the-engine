import React from "react";
import PageClient from './pageClient'

const BundleEditPage = async ({ params }: {params: Promise<{ ksuid: string; bundleKsuid: string }>}) => {  
  const {ksuid, bundleKsuid} = await params;
  return (
    <div className="min-h-screen flex flex-col justify-start items-center px-2 sm:px-4 lg:px-8 ">
      <h1 className="text-2xl font-bold mb-4 w-full">Bundle Form</h1>
      <PageClient eventKsuid={ksuid} bundleKsuid={bundleKsuid}/>
    </div>
  );
};

export default BundleEditPage;
