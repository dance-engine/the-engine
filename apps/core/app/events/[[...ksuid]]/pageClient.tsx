'use client'

import dynamic from "next/dynamic";
import { MapPickerProps } from '@dance-engine/ui/types'
import DynamicForm from "@dance-engine/ui/form/DynamicForm";
import { eventSchema, eventMetadata } from "@dance-engine/schemas/events"; // Import the schema
import { FieldValues } from "react-hook-form";
import KSUID from "ksuid";

const MapPicker = dynamic(() => import('@dance-engine/ui/form/fields/MapPicker'), { ssr: false }) as React.FC<MapPickerProps>


const PageClient = ({ ksuid }: { ksuid?: string }) => {
  const handleSubmit = (data: FieldValues) => {
    console.log("Form Submitted:", data);
  };

  console.log("params",ksuid)

  const eventKsuid = ksuid || `EVENT#${KSUID.randomSync().string}`; // Extract the ksuid if it exists

  return <DynamicForm schema={eventSchema} metadata={eventMetadata} onSubmit={handleSubmit} MapComponent={MapPicker} initValues={{ksuid: eventKsuid}}/>
}

export default PageClient