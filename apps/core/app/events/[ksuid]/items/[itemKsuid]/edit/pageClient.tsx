'use client'
import DynamicForm from "@dance-engine/ui/form/DynamicForm";
import { itemSchema, itemMetadata } from "@dance-engine/schemas/item";
import { FieldValues } from "react-hook-form";
import { useOrgContext } from '@dance-engine/utils/OrgContext'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from "next/navigation";
import useClerkSWR from "@dance-engine/utils/clerkSWR";
import { useEffect, useState, useMemo } from "react";
import { DanceEngineEntity } from '@dance-engine/ui/types'

const PageClient = ({ eventKsuid, itemKsuid }: { eventKsuid?: string; itemKsuid?: string }) => {
  const router = useRouter()
  const { activeOrg } = useOrgContext()
  const { getToken } = useAuth()

  const itemsEndpoint = `${process.env.NEXT_PUBLIC_DANCE_ENGINE_API}/${activeOrg}/${eventKsuid}/items`
  const itemApiUrl = `${itemsEndpoint}/${itemKsuid}`
  const defaultEntity = useMemo(() => ({ type: "ITEM", ksuid: itemKsuid }), [itemKsuid])
  const { data, error, isLoading } = useClerkSWR(
    activeOrg && itemKsuid ? itemApiUrl : null
  )

  const remoteEntity = data || defaultEntity

  const [entity, setEntity] = useState({ ksuid: "" } as DanceEngineEntity)

  const handleSubmit = async (data: FieldValues) => {
    console.log("Form Submitted:", data, "destination", { orgSlug: activeOrg, url: itemsEndpoint })
    const { _meta, ...cleanedData } = data
    console.log("Meta", _meta)
    const itemId = data.ksuid
    try {
      const res = await fetch(itemsEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await getToken()}`
        },
        body: JSON.stringify({ items: [cleanedData] }),
      })

      const result = await res.json()
      const storageKey = `${activeOrg}:ITEM#${itemId}`
      const previousCache = JSON.parse(localStorage.getItem(storageKey) || '{}')
      if (!res.ok) {
        const failedCache = JSON.stringify({ ...previousCache, ...{ meta: { saved: 'failed', updated_at: new Date().toISOString() } } })
        localStorage.setItem(storageKey, failedCache)
        console.error("Failed to save", storageKey, failedCache)
        throw new Error(result.message || "Something went wrong")
      } else {
        const savedCache = JSON.stringify({ ...previousCache, ...{ meta: { saved: 'saved', updated_at: new Date().toISOString() } } })
        localStorage.setItem(storageKey, savedCache)
        console.log("Item saved!", result, storageKey, savedCache)
        router.push(`/events/${eventKsuid}/bundles`)
      }
    } catch (err) {
      console.error("Error saving item", err)
    }
  }

  useEffect(() => {
    const blankEntity = {
      entity_type: "ITEM",
      ksuid: itemKsuid,
      version: 1
    } as DanceEngineEntity
    const initEntity = { ...blankEntity, ...remoteEntity.item }
    setEntity(initEntity)
  }, [remoteEntity, itemKsuid])

  if (error) {
    console.error(error)
  }

  if (isLoading || !entity) {
    return "Loading..."
  }

  if (!activeOrg) {
    return "No Active Org"
  }

  return !isLoading && entity && entity.ksuid && entity.ksuid !== ""
    ? (
      <DynamicForm
        schema={itemSchema}
        {...(activeOrg ? { orgSlug: activeOrg } : {})}
        metadata={itemMetadata}
        onSubmit={handleSubmit}
        persistKey={entity}
        data={entity}
      />
    )
    : null
}

export default PageClient
