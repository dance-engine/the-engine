import React from "react";
import PageClient from './pageClient'

const ItemEditPage = async ({ params }: { params: Promise<{ ksuid: string; itemKsuid: string }> }) => {
  const { ksuid, itemKsuid } = await params;
  return (
    <div className="min-h-screen flex flex-col justify-start items-center px-2 sm:px-4 lg:px-8">
      <h1 className="text-2xl font-bold mb-4 w-full">Item Form</h1>
      <PageClient eventKsuid={ksuid} itemKsuid={itemKsuid} />
    </div>
  );
};

export default ItemEditPage;
