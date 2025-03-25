'use client'
import dynamic from "next/dynamic";
import { MapPickerProps, DanceEngineEntity } from '@dance-engine/ui/types'
import DynamicForm from "@dance-engine/ui/form/DynamicForm";
import { eventSchema, eventMetadata } from "@dance-engine/schemas/events"; // Import the schema
import { FieldValues } from "react-hook-form";
// import KSUID from "ksuid";
// import { useRouter,usePathname } from "next/navigation";
// import { useEffect } from "react";

const MapPicker = dynamic(() => import('@dance-engine/ui/form/fields/MapPicker'), { ssr: false }) as React.FC<MapPickerProps>


const PageClient = ({ ksuid }: { ksuid?: string }) => {
  const handleSubmit = (data: FieldValues) => {
    console.log("Form Submitted:", data);
  };
  // const router = useRouter()
  // const path = usePathname()
  
  // useEffect(() => {
  //   const generatedKsuid = `${KSUID.randomSync().string}`
  //   console.log("effect",ksuid,generatedKsuid)
  //   if (!ksuid || ksuid == 'new') { router.replace([path.replace('/new',''),generatedKsuid].join('/')) }
  // },[])

  const eventEntityId = {
    type: "EVENT",
    ksuid: ksuid // Extract the ksuid if it exists
  } as DanceEngineEntity

  return ksuid && ksuid != 'new' ? <DynamicForm schema={eventSchema} metadata={eventMetadata} onSubmit={handleSubmit} MapComponent={MapPicker} persistKey={eventEntityId} initValues={{ksuid: eventEntityId.ksuid}}/> : null
}

export default PageClient