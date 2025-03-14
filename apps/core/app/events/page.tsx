"use client";

import React from "react";
import dynamic from "next/dynamic";
import DynamicForm from "@dance-engine/ui/form/DynamicForm";
import { eventSchema, eventMetadata } from "@dance-engine/schemas/events"; // Import the schema
import { FieldValues } from "react-hook-form";
import { MapPickerProps } from '@dance-engine/ui/types'
const MapPicker = dynamic(() => import('@dance-engine/ui/form/fields/MapPicker'), { ssr: false }) as React.FC<MapPickerProps>

const Page = () => {
  const handleSubmit = (data: FieldValues) => {
    console.log("Form Submitted:", data);
  };

  return (
    <div className="min-h-screen flex flex-col justify-start items-center">
      <h1 className="text-2xl font-bold mb-4">Test Form</h1>
      <DynamicForm schema={eventSchema} metadata={eventMetadata} onSubmit={handleSubmit} MapComponent={MapPicker}/>
    </div>
  );
};

export default Page;
