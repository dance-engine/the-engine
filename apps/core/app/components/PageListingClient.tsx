'use client'
import dynamic from "next/dynamic";
import { useMemo } from "react";
import useClerkSWR, { CorsError }  from '@dance-engine/utils/clerkSWR'
import { useOrgContext } from '@dance-engine/utils/OrgContext';
// import {EventType, eventSchema} from '@dance-engine/schemas/events'
import { validateEntity, EntityNameType, EntityType } from '@dance-engine/schemas'
import Spinner from '@dance-engine/ui/general/Spinner'
import { IoCloudOffline } from "react-icons/io5";

const BasicList = dynamic(() => import('@dance-engine/ui/list/BasicList'), { //TODO Does this actually need to be dynamic?
  ssr: false, // ⬅ Disables SSR for this component
});


const PageListingClient = ({ entity, columns = ["name","ksuid"], formats=[undefined,undefined] }: { entity: EntityNameType, columns?: string[], formats?: (string|undefined)[] }) => {
  const eventsApiUrl = `${process.env.NEXT_PUBLIC_DANCE_ENGINE_API}/{org}/${entity?.toLowerCase()}s`
  const { activeOrg } = useOrgContext() 
  const { data: remoteEntityData= [], error, isLoading } = useClerkSWR(eventsApiUrl.replace('/{org}',activeOrg ? `/${activeOrg}`: ''),{ suspense: false, });

  const getEntity = (entityType: EntityNameType) => {
    const cached = window.localStorage.getItem(`local:${entityType}`)
    return cached ? JSON.parse(cached)?.map((entry: EntityType)=>{
      const parsed = JSON.parse(window.localStorage.getItem(`${entry}`) || '{}')
      const result = validateEntity(entityType,parsed)
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
    const byId = new Map<string, EntityType>() 
    const remoteEntities = entity == "EVENT" ? remoteEntityData.events : remoteEntityData
    console.log("remoteEntities",remoteEntities)
    // Step 1: Add remote records
    if(remoteEntities){ //TODO This is now tied to events
      remoteEntities.forEach((r: EntityType) => {
        const id = String(r.ksuid)
        const newMeta = { ...(r.meta ?? {}), valid: true, source: `remote${id}`, saved: "saved"}
        byId.set(id, { ...r, meta: newMeta})
      })
    } 

    // Step 2: Add local ones that aren't already present or have updates
    localEntities.forEach((r: EntityType) => {
      const id = String(r.ksuid)
      const remoteEntity = byId.get(id)

      if(!remoteEntity) {
        byId.set(id, { ...r, meta: { ...(r.meta ?? {}), source: 'local (unsaved)' } })
      } else if( remoteEntity.version && r.version && remoteEntity.version <= r.version) {
        byId.set(id, { ...r, meta: { ...(r.meta ?? {}), source: 'local (newer)' } })
      } else {
        byId.set(`${id}`, { ...remoteEntity, meta: { ...(remoteEntity.meta ?? {}), source: `remote (newer)` } })
      }
    })
    return Array.from(byId.values())
  },[remoteEntityData,localEntities,entity])

  
  return (
  <div className="mt-4 w-full">
    { isLoading || error ? <div className="flex items-center gap-1 px-4 py-1 bg-pear-on-light text-gray-100 dark:text-gray-600 font-bold"> <Spinner className="w-4 h-4"/> Loading </div> : null }
    { (error instanceof CorsError) ? <div className="px-4 py-4 flex justify-center items-center gap-2 text-lg bg-red-800 text-white">Looks like a CORS issue (server unreachable or blocked)</div> : null }
    { error ? <div className="px-4 py-4 flex justify-center items-center gap-2 text-lg bg-red-800 text-white"> <IoCloudOffline className="w-6 h-6"/>Failed to Load events, Offline mode</div> : null }
    { allEntities ? <BasicList 
        entity={entity}
        columns={columns}
        formats={formats}
        records={allEntities}
        activeOrg={activeOrg || ''}
      /> : null
    }
    
  </div>
    
  )
}

export default PageListingClient