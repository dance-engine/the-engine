'use client'
import dynamic from "next/dynamic";
import { MapPickerProps, DanceEngineEntity } from '@dance-engine/ui/types'
import DynamicForm from "@dance-engine/ui/form/DynamicForm";
import { eventSchema, eventMetadata } from "@dance-engine/schemas/events"; // Import the schema
import { FieldValues } from "react-hook-form";
import {useOrgContext} from '@dance-engine/utils/OrgContext'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from "next/navigation";
import useClerkSWR from "@dance-engine/utils/clerkSWR";
// import KSUID from "ksuid";
// import { useRouter,usePathname } from "next/navigation";
import { useEffect, useState, useMemo } from "react";

const MapPicker = dynamic(() => import('@dance-engine/ui/form/fields/MapPicker'), { ssr: false }) as React.FC<MapPickerProps>


const PageClient = ({ ksuid }: { ksuid?: string }) => {
  const router = useRouter()
  const { activeOrg } = useOrgContext() 
  const { getToken } = useAuth()

  const baseUrlEndpoint = `${process.env.NEXT_PUBLIC_DANCE_ENGINE_API}/{org}/events`.replace('/{org}',`/${activeOrg}`)
  const createUrlEndpoint = baseUrlEndpoint
  const eventsApiUrl = `${baseUrlEndpoint}/${ksuid}`
  const defaultEntity = useMemo(() => ({ type: "EVENT", ksuid }), [ksuid])
  const { data, error, isLoading } = useClerkSWR(eventsApiUrl)
  
  const remoteEntity = data || defaultEntity
  
  const [entity, setEntity] = useState({ksuid: ""} as DanceEngineEntity)

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
        body: JSON.stringify({event: cleanedData }),
      })

      const result = await res.json()

      const previousCache = JSON.parse(localStorage.getItem(eventId) || '{}')
      if (!res.ok) {
        const failedCache = JSON.stringify({...previousCache, ...{meta: { saved: 'failed', updated_at: new Date().toISOString()}}})
        localStorage.setItem(eventId,failedCache)
        console.error("Failed to save",eventId,failedCache)
        throw new Error(result.message || "Something went wrong")
      } else {
        const savedCache = JSON.stringify({...previousCache, ...{meta: { saved: 'saved', updated_at: new Date().toISOString()}}})
        localStorage.setItem(eventId,savedCache)
        console.log("Event created!", result, eventId,savedCache)
        router.push("/events")
      }
     
      
    } catch (err) {
      console.error("Error creating event", err)
    }
  };

  useEffect(()=>{
    const blankEntity = {
      entity_type: "EVENT",
      ksuid: ksuid, // Extract the ksuid if it exists
      version: 1
    } as DanceEngineEntity
    // const localEntity = JSON.parse(typeof window !== "undefined" ? localStorage.getItem(`${blankEntity.type}#${blankEntity.ksuid}`) || "{}" : "{}")
    // const initEntity = {...blankEntity, ...remoteEntity[0], ...localEntity}
    const initEntity = {...blankEntity, ...remoteEntity.event}
    setEntity(initEntity)
  },[remoteEntity,ksuid])
  
  if(error) {
    console.error(error)
  }

  if(isLoading || !entity) {
    return "Loading..."
  }

  if(!activeOrg) {
    return "No Active Org"
  }

  

  return !isLoading && entity && entity.ksuid && entity.ksuid != ""
    ? <><DynamicForm 
        schema={eventSchema} 
        {...(activeOrg ? {orgSlug: activeOrg} : {})} 
        metadata={eventMetadata} 
        onSubmit={handleSubmit}  
        MapComponent={MapPicker} 
        persistKey={entity} 
        data={entity}
      />
        {/* <pre className="max-w-full">{JSON.stringify(entity,null,2)}</pre> */}
      </> 
    : null

  return <pre>{JSON.stringify(entity,null,2)}</pre>
}

export default PageClient