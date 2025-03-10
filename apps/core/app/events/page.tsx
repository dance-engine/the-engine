"use client";

import React from "react";
import DynamicForm from "@dance-engine/ui/form/DynamicForm";
import { eventSchema, eventMetadata } from "@dance-engine/schemas/events"; // Import the schema
import { FieldValues } from "react-hook-form";

const Page = () => {
  const handleSubmit = (data: FieldValues) => {
    console.log("Form Submitted:", data);
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gray-100 p-4">
      <h1 className="text-2xl font-bold mb-4">Test Form</h1>
      <DynamicForm schema={eventSchema} metadata={eventMetadata} onSubmit={handleSubmit} />
    </div>
  );
};

export default Page;
