import React from "react";
import MediaEventList from "./MediaEventList";

const MediaPage = async () => {
  return (
    <div className="flex flex-col justify-start items-center relative">
      <div className="sm:flex sm:items-center w-full px-4 lg:px-8 pb-0">
        <div className="sm:flex-auto">
          <h1 className="text-base font-semibold text-gray-900">Media</h1>
          <p className="mt-2 text-sm text-gray-700">
            Select an event to manage its photos and media
          </p>
        </div>
      </div>
      <MediaEventList />
    </div>
  );
};

export default MediaPage;
