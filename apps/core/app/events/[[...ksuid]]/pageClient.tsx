'use client'
import dynamic from "next/dynamic";
import { MapPickerProps, DanceEngineEntity } from '@dance-engine/ui/types'
import DynamicForm from "@dance-engine/ui/form/DynamicForm";
import { eventSchema, eventMetadata } from "@dance-engine/schemas/events"; // Import the schema
import { FieldValues } from "react-hook-form";
import KSUID from "ksuid";

const MapPicker = dynamic(() => import('@dance-engine/ui/form/fields/MapPicker'), { ssr: false }) as React.FC<MapPickerProps>


const PageClient = ({ ksuid }: { ksuid?: string }) => {
  const handleSubmit = (data: FieldValues) => {
    console.log("Form Submitted:", data);
  };

  const eventEntityId = {
    type: "EVENT",
    ksuid: ksuid || `${KSUID.randomSync().string}` // Extract the ksuid if it exists
  } as DanceEngineEntity
  return eventEntityId ? <DynamicForm schema={eventSchema} metadata={eventMetadata} onSubmit={handleSubmit} MapComponent={MapPicker} persistKey={eventEntityId} initValues={{ksuid: eventEntityId.ksuid}}/> : null
}

export default PageClient