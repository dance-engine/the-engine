'use client'
import dynamic from "next/dynamic";
import { MapPickerProps, DanceEngineEntity } from '@dance-engine/ui/types'
import DynamicForm from "@dance-engine/ui/form/DynamicForm";
import { bundleSchema, bundleMetadata } from "@dance-engine/schemas/bundle";
import { FieldValues } from "react-hook-form";
import {useOrgContext} from '@dance-engine/utils/OrgContext'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from "next/navigation";
import useClerkSWR from "@dance-engine/utils/clerkSWR";
import { useEffect, useState, useMemo } from "react";

const MapPicker = dynamic(() => import('@dance-engine/ui/form/fields/MapPicker'), { ssr: false }) as React.FC<MapPickerProps>


const PageClient = ({ eventKsuid, bundleKsuid }: { eventKsuid?: string; bundleKsuid?: string }) => {
  const router = useRouter()
  const { activeOrg } = useOrgContext() 
  const { getToken } = useAuth()

  const bundlesEndpoint = `${process.env.NEXT_PUBLIC_DANCE_ENGINE_API}/${activeOrg}/${eventKsuid}/bundles`
  const bundleApiUrl = `${bundlesEndpoint}/${bundleKsuid}`
  const defaultEntity = useMemo(() => ({ type: "BUNDLE", ksuid: bundleKsuid }), [bundleKsuid])
  const { data, error, isLoading } = useClerkSWR(activeOrg && bundleKsuid ? bundleApiUrl : null)
  
  const remoteEntity = data || defaultEntity
  
  const [entity, setEntity] = useState({ksuid: ""} as DanceEngineEntity)

  const handleSubmit = async (data: FieldValues) => {
    console.log("Form Submitted:", data, "destination", { orgSlug: activeOrg, url: baseUrlEndpoint});
    const {_meta, ...cleanedData} = data
    console.log("Meta", _meta)
    const bundleId = `BUNDLE#${data.ksuid}`
    try {
      const res = await fetch(baseUrlEndpoint, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${await getToken()}`

        },
        body: JSON.stringify({bundle: cleanedData }),
      })

      const result = await res.json()

      const previousCache = JSON.parse(localStorage.getItem(bundleId) || '{}')
      if (!res.ok) {
        const failedCache = JSON.stringify({...previousCache, ...{meta: { saved: 'failed', updated_at: new Date().toISOString()}}})
        localStorage.setItem(bundleId,failedCache)
        console.error("Failed to save",bundleId,failedCache)
        throw new Error(result.message || "Something went wrong")
      } else {
        const savedCache = JSON.stringify({...previousCache, ...{meta: { saved: 'saved', updated_at: new Date().toISOString()}}})
        localStorage.setItem(bundleId,savedCache)
        console.log("Bundle saved!", result, bundleId,savedCache)
        router.push(`/events/${eventKsuid}/bundles`)
      }
     
      
    } catch (err) {
      console.error("Error saving bundle", err)
    }
  };

  useEffect(()=>{
    const blankEntity = {
      entity_type: "BUNDLE",
      ksuid: bundleKsuid,
      version: 1
    } as DanceEngineEntity
    const initEntity = {...blankEntity, ...remoteEntity.bundle}
    setEntity(initEntity)
  },[remoteEntity,bundleKsuid])
  
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
        schema={bundleSchema} 
        {...(activeOrg ? {orgSlug: activeOrg} : {})} 
        metadata={bundleMetadata} 
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
