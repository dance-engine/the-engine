'use client'
import dynamic from "next/dynamic";
import { MapPickerProps, DanceEngineEntity } from '@dance-engine/ui/types'
import DynamicForm from "@dance-engine/ui/form/DynamicForm";
import { eventSchema, eventMetadata, EventResponseType } from "@dance-engine/schemas/events"; // Import the schema
import { FieldValues } from "react-hook-form";
import {useOrgContext} from '@dance-engine/utils/OrgContext'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from "next/navigation";
import useClerkSWR from "@dance-engine/utils/clerkSWR";
// import KSUID from "ksuid";
// import { useRouter,usePathname } from "next/navigation";
import { useEffect, useState, useMemo } from "react";

const MapPicker = dynamic(() => import('@dance-engine/ui/form/fields/MapPicker'), { ssr: false }) as React.FC<MapPickerProps>

const toNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return parsed;
};


const PageClient = ({ ksuid }: { ksuid?: string }) => {
  const router = useRouter()
  const { activeOrg } = useOrgContext() 
  const { getToken } = useAuth()

  const baseUrlEndpoint = `${process.env.NEXT_PUBLIC_DANCE_ENGINE_API}/{org}/events`.replace('/{org}',`/${activeOrg}`)
  // const createUrlEndpoint = baseUrlEndpoint
  const eventsApiUrl = `${baseUrlEndpoint}/${ksuid}`
  const defaultEntity = useMemo(() => ({ type: "EVENT", ksuid }), [ksuid])
  const { data, error, isLoading } = useClerkSWR(eventsApiUrl)
  const { data: eventsListData } = useClerkSWR(baseUrlEndpoint)
  
  const remoteEntity = data || defaultEntity

  const allEvents = useMemo<EventResponseType[]>(() => {
    const source = Array.isArray(eventsListData?.events)
      ? eventsListData.events
      : eventsListData?.events && typeof eventsListData.events === "object"
        ? Object.values(eventsListData.events)
        : []
    return source as EventResponseType[]
  }, [eventsListData])

  const previousEventOptions = useMemo(() => {
    return allEvents
      .filter((event) => event.ksuid && event.ksuid !== ksuid)
      .sort((a, b) => {
        const aTs = a.starts_at ? new Date(a.starts_at).getTime() : 0
        const bTs = b.starts_at ? new Date(b.starts_at).getTime() : 0
        return bTs - aTs
      })
      .map((event) => ({
        value: event.ksuid as string,
        label: event.name ? `${event.name} (${event.ksuid})` : (event.ksuid as string),
      }))
  }, [allEvents, ksuid])

  const formMetadata = useMemo(() => ({
    ...eventMetadata,
    previous_event_ksuid: {
      ...(eventMetadata.previous_event_ksuid || {}),
      selectField: true,
      selectOptions: previousEventOptions,
    },
  }), [previousEventOptions])
  
  const [entity, setEntity] = useState({ksuid: ""} as DanceEngineEntity)

  const handleSubmit = async (data: FieldValues) => {
    console.log("Form Submitted:", data, "destination", { orgSlug: activeOrg, url: eventsApiUrl});
    const {_meta, ...cleanedData} = data
    console.log("Meta", _meta)
    const eventId = data.ksuid
    const existingEvent = remoteEntity?.event as Record<string, unknown> | undefined
    const isExistingEvent = Boolean(existingEvent?.ksuid)

    const capacity = toNumber(cleanedData.capacity, toNumber(existingEvent?.capacity));
    const numberSold = isExistingEvent
      ? toNumber(existingEvent?.number_sold)
      : 0;
    const reserved = isExistingEvent
      ? toNumber(existingEvent?.reserved)
      : 0;
    const remainingCapacity = capacity - reserved - numberSold;

    if (remainingCapacity < 0) {
      const message = "More tickets reserved or sold than this amount";
      alert(message);
      console.error(message, { capacity, reserved, numberSold, remainingCapacity });
      return;
    }

    const eventPayload = {
      ...cleanedData,
      capacity,
      number_sold: numberSold,
      reserved,
      remaining_capacity: remainingCapacity,
    };

    try {
      const res = await fetch(eventsApiUrl, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${await getToken()}`

        },
        body: JSON.stringify({event: eventPayload }),
      })

      const result = await res.json()
      const storageKey = `${activeOrg}:EVENT#${eventId}`
      const previousCache = JSON.parse(localStorage.getItem(storageKey) || '{}')
      if (!res.ok) {
        const failedCache = JSON.stringify({...previousCache, ...{meta: { saved: 'failed', updated_at: new Date().toISOString()}}})
        localStorage.setItem(storageKey,failedCache)
        console.error("Failed to save",storageKey,failedCache)
        throw new Error(result.message || "Something went wrong")
      } else {
        const savedCache = JSON.stringify({...previousCache, ...{meta: { saved: 'saved', updated_at: new Date().toISOString()}}})
        localStorage.setItem(storageKey,savedCache)
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
        metadata={formMetadata} 
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