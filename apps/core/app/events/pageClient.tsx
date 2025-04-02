'use client'
import dynamic from "next/dynamic";
import { useEffect, useMemo } from "react";
import useClerkSWR, { CorsError }  from '@dance-engine/utils/clerkSWR'
import { useOrgContext } from '@dance-engine/utils/OrgContext';
import {EventType, eventSchema} from '@dance-engine/schemas/events'
import Spinner from '@dance-engine/ui/general/Spinner'
import { IoCloudOffline } from "react-icons/io5";

const BasicList = dynamic(() => import('@dance-engine/ui/list/BasicList'), {
  ssr: false, // ⬅ Disables SSR for this component
});

const eventsApiUrl = `${process.env.NEXT_PUBLIC_DANCE_ENGINE_API}/{org}/events`


const PageClient = ({ entity }: { entity?: string }) => {
  const { activeOrg } = useOrgContext() 
  const { data: remoteEntities = [], error, isLoading } = useClerkSWR(eventsApiUrl.replace('/{org}',activeOrg ? `/${activeOrg}`: ''),{
    suspense: false, // Make sure this is off for now
  });
  
  const getEntity = (entityType: string) => {
    const cached = window.localStorage.getItem(entityType)
    return cached ? JSON.parse(cached)?.map((entry: EventType)=>{
      const parsed = JSON.parse(window.localStorage.getItem(`${entityType}#${entry}`) || '{}')
      const result = eventSchema.safeParse(parsed)
      const entity = result.success
        ? { ...result.data, meta: { ...(result.data.meta ?? {}), valid: true } }
        : { ...(parsed ?? {}), meta: { ...(parsed?.meta ?? {}), valid: false } }
      return entity
    }).filter(Boolean) : []
  }
  
  const localEntities = useMemo(() => {
    return typeof window !== "undefined" && entity ? getEntity(entity): []
  },[entity])

  const allEntities = useMemo(() => {
    // return [...remoteEntities,...localEntities]
    const byId = new Map<string, EventType>()

    // Step 1: Add remote records
    remoteEntities.forEach((r: EventType) => {
      const id = String(r.ksuid)
      const newMeta = { ...(r.meta ?? {}), valid: true, source: 'remote', saved: "saved"}
      byId.set(id, { ...r, meta: newMeta})
    })

    // Step 2: Add local ones that aren't already present
    localEntities.forEach((r: EventType) => {
      const id = String(r.ksuid)
      const mapEntity = byId.get(id)
      if (!byId.has(id)) {
        byId.set(id, { ...r, meta: { ...(r.meta ?? {}), source: 'local-only' } })
      }
      else if( mapEntity && r.meta && mapEntity?.meta && mapEntity?.meta?.updated_at && r.meta.updated_at && r.meta.updated_at > mapEntity.meta.updated_at ) {
        byId.set(id, { ...byId.get(id), ...r, meta: { ...(r.meta ?? {}), valid: true, source: 'both', saved: "changed-locally"} })
      }
      else {
        console.log("Remote ent: ",id, mapEntity?.meta?.updated_at,r.meta?.updated_at)
      }
    })
    return Array.from(byId.values())
  },[remoteEntities,localEntities])

  
  return (
  <div className="mt-4 w-full">
    { isLoading || error ? <div className="flex items-center gap-1 px-4 py-1 bg-pear-on-light text-gray-100 dark:text-gray-600 font-bold"> <Spinner className="w-4 h-4"/> Loading </div> : null }
    { (error instanceof CorsError) ? <div>Looks like a CORS issue (server unreachable or blocked)</div> : null }
    { error ? <div className="px-4 py-4 flex justify-center items-center gap-2 text-lg bg-red-800 text-white"> <IoCloudOffline className="w-6 h-6"/>Failed to Load events, Offline mode</div> : null }
    { allEntities ? <BasicList 
        columns={["name","starts_at","starts_at","ends_at","category","meta.saved"]} 
        formats={[undefined,undefined,'time','time',undefined,'icon']} 
        records={allEntities}
      /> : null
    }
    {/* {JSON.stringify(error)} - {JSON.stringify(remoteEntities)} */}
  </div>
    
  )
}

export default PageClient