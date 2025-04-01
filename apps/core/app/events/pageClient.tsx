'use client'
import dynamic from "next/dynamic";
import { useMemo } from "react";
import useClerkSWR from '@dance-engine/utils/clerkSWR'
import { useOrgContext } from '@dance-engine/utils/OrgContext';
import {EventType, eventSchema} from '@dance-engine/schemas/events'
const BasicList = dynamic(() => import('@dance-engine/ui/list/BasicList'), {
  ssr: false, // ⬅ Disables SSR for this component
});

const eventsApiUrl = `${process.env.NEXT_PUBLIC_DANCE_ENGINE_API}/{org}/events`


const PageClient = ({ entity }: { entity?: string }) => {
  const { activeOrg } = useOrgContext() 
  const { data: remoteEntities = [], error, isLoading } = useClerkSWR(eventsApiUrl.replace('/{org}',activeOrg ? `/${activeOrg}`: ''));
  
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
    const byId = new Map<string, Record<string, unknown>>()

    // Step 1: Add remote records
    remoteEntities.forEach((r: EventType) => {
      const id = String(r.ksuid)
      byId.set(id, { ...r, meta: { ...(r.meta ?? {}), valid: true, source: 'remote', saved: "saved"} })
    })

    // Step 2: Add local ones that aren't already present
    localEntities.forEach((r: EventType) => {
      const id = String(r.ksuid)
      if (!byId.has(id)) {
        byId.set(id, { ...r, meta: { ...(r.meta ?? {}), source: 'local-only' } })
      }
      else if(byId.get(id) && r.meta && byId.get(id)?.updated_at && r.meta.updated_at && r.meta.updated_at > byId.get(id)?.updated_at ) {
        byId.set(id, { ...byId.get(id), ...r, meta: { ...(r.meta ?? {}), valid: true, source: 'both', saved: "changed-locally"} })
      }
      else {
        console.log("Remote ent: ",id,byId.get(id).updated_at,r.meta.updated_at)
      }
    })
    return Array.from(byId.values())
  },[remoteEntities,localEntities])

  
  
  return (
    <BasicList 
      columns={["name","starts_at","starts_at","ends_at","category","meta.saved"]} 
      formats={[undefined,undefined,'time','time',undefined,'icon']} 
      records={allEntities}
    />
  )
}

export default PageClient