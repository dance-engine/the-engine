'use client'
import dynamic from "next/dynamic";
import { MapPickerProps, DanceEngineEntity } from '@dance-engine/ui/types'
import DynamicForm from "@dance-engine/ui/form/DynamicForm";
import { eventSchema, eventMetadata } from "@dance-engine/schemas/events"; // Import the schema
import { FieldValues } from "react-hook-form";
import {useOrgContext} from '@dance-engine/utils/OrgContext'
import { useAuth } from '@clerk/nextjs'
// import KSUID from "ksuid";
// import { useRouter,usePathname } from "next/navigation";
// import { useEffect } from "react";

const MapPicker = dynamic(() => import('@dance-engine/ui/form/fields/MapPicker'), { ssr: false }) as React.FC<MapPickerProps>


const PageClient = ({ ksuid }: { ksuid?: string }) => {
  
  const { activeOrg } = useOrgContext() 
  const { getToken } = useAuth()
  const createUrlEndpoint = `${process.env.NEXT_PUBLIC_DANCE_ENGINE_API}/{org}/events`.replace('/{org}',`/${activeOrg}`)

  const handleSubmit = async (data: FieldValues) => {
    console.log("Form Submitted:", data, "destination", { orgSlug: activeOrg, url: createUrlEndpoint});
    const {_meta, ...cleanedData} = data
    console.log("Meta", _meta)
    const eventId = `EVENT#${data.ksuid}`
    try {
      const res = await fetch(createUrlEndpoint, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${await getToken()}`

        },
        body: JSON.stringify(cleanedData),
      })

      const result = await res.json()

      const previousCache = JSON.parse(localStorage.getItem(eventId) || '{}')
      if (!res.ok) {
        const failedCache = JSON.stringify({...previousCache, ...{meta: { saved: 'failed' }}})
        localStorage.setItem(eventId,failedCache)
        console.error("Failed to save",eventId,failedCache)
        throw new Error(result.message || "Something went wrong")
      } else {
        const savedCache = JSON.stringify({...previousCache, ...{meta: { saved: 'saved' }}})
        localStorage.setItem(eventId,savedCache)
        console.log("Event created!", result, eventId,savedCache)
      }
     
      
    } catch (err) {
      console.error("Error creating event", err)
    }
  };

  const eventEntityId = {
    type: "EVENT",
    ksuid: ksuid // Extract the ksuid if it exists
  } as DanceEngineEntity

  return ksuid && ksuid != 'new' && activeOrg ? <DynamicForm schema={eventSchema} {...(activeOrg ? {orgSlug: activeOrg} : {})} metadata={eventMetadata} onSubmit={handleSubmit}  MapComponent={MapPicker} persistKey={eventEntityId} initValues={{ksuid: eventEntityId.ksuid}}/> : null
}

export default PageClient