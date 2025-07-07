'use client'
import { DanceEngineEntity } from '@dance-engine/ui/types'
import DynamicForm from "@dance-engine/ui/form/DynamicForm";
import { organisationSchema, organisationMetadata } from "@dance-engine/schemas/organisation"; // Import the schema
import { FieldValues } from "react-hook-form";
import {useOrgContext} from '@dance-engine/utils/OrgContext'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from "next/navigation";
import useClerkSWR from "@dance-engine/utils/clerkSWR";
// import KSUID from "ksuid";
// import { useRouter,usePathname } from "next/navigation";
import { useEffect, useState, useMemo } from "react";



const OrgPageClient = ({ ksuid }: { ksuid?: string }) => {
  const router = useRouter()
  const { activeOrg } = useOrgContext() 
  const { getToken } = useAuth()

  const baseUrlEndpoint = `${process.env.NEXT_PUBLIC_DANCE_ENGINE_API}/{org}/settings`.replace('/{org}',`/${activeOrg || "demo"}`)
  const updateUrlEndpoint = baseUrlEndpoint
  const defaultEntity = useMemo(() => ({ type: "ORGANISATION", activeOrg }), [activeOrg])
  const { data, error, isLoading } = useClerkSWR(updateUrlEndpoint)
  
  
  
  const [entity, setEntity] = useState({ksuid: ""} as DanceEngineEntity)

  const handleSubmit = async (data: FieldValues) => {
    console.log("Form Submitted:", data, "destination", { orgSlug: activeOrg, url: updateUrlEndpoint});
    const {_meta, ...cleanedData} = data
    console.log("Meta", _meta)
    const organisationSlug = `ORGANISATION#${data.ksuid}`
    try {
      const res = await fetch(updateUrlEndpoint, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${await getToken()}`

        },
        body: JSON.stringify({organisation: cleanedData}),
      })

      const result = await res.json()

      const previousCache = JSON.parse(localStorage.getItem(organisationSlug) || '{}')
      if (!res.ok) {
        const failedCache = JSON.stringify({...previousCache, ...{meta: { saved: 'failed', updated_at: new Date().toISOString()}}})
        localStorage.setItem(organisationSlug,failedCache)
        console.error("Failed to save",organisationSlug,failedCache)
        throw new Error(result.message || "Something went wrong")
      } else {
        const savedCache = JSON.stringify({...previousCache, ...{meta: { saved: 'saved', updated_at: new Date().toISOString()}}})
        localStorage.setItem(organisationSlug,savedCache)
        console.log("Organisation settings saved!", result, organisationSlug,savedCache)
        router.push("/settings/org")
      }
     
      
    } catch (err) {
      console.error("Error creating event", err)
    }
  };

  useEffect(()=>{
    const blankEntity = {
      entity_type: "ORGANTISATION",
      ksuid: ksuid, // Extract the ksuid if it exists
      version: 1
    } as DanceEngineEntity
    // const localEntity = JSON.parse(typeof window !== "undefined" ? localStorage.getItem(`${blankEntity.type}#${blankEntity.ksuid}`) || "{}" : "{}")
    // const initEntity = {...blankEntity, ...remoteEntity[0], ...localEntity}
    const remoteEntity = data || defaultEntity
    const initEntity = {...blankEntity, ...remoteEntity.organisation}
    console.log("Data", data, "\nremoteEntity", remoteEntity, "\nactiveOrg", activeOrg, "\nInitial Entity", initEntity,)
    setEntity(initEntity)
  },[activeOrg,data,defaultEntity, ksuid])
  
  if(error) {
    console.error(error)
  }

  if(isLoading || !entity) {
    return "Loading..."
  }

  if(!activeOrg) {
    return "No Active Org"
  }

  return !isLoading && entity && activeOrg && data
    ? <><DynamicForm 
        schema={organisationSchema} 
        {...(activeOrg ? {orgSlug: activeOrg} : {})} 
        metadata={organisationMetadata} 
        onSubmit={handleSubmit}  
        persistKey={entity} 
        data={entity}
      />
        {/* <pre className="max-w-full">{JSON.stringify(data,null,2)}</pre>
        <pre className="max-w-full">{JSON.stringify(entity,null,2)}</pre>
        <pre className="max-w-full">{JSON.stringify(activeOrg,null,2)}</pre> */}
      </> 
    : null

}

export default OrgPageClient