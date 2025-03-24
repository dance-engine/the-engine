'use client'
import { createContext, useContext, useEffect, useState, ReactNode } from "react"
import type { UserResource } from "@clerk/types"
import { OrgProviderClient } from './OrgProviderClient'

export const OrgProvider = ({ children }: { children: React.ReactNode }) => {
  return <OrgProviderClient>{children}</OrgProviderClient>
}


export type OrgSlug = string

export type OrgContextType = {
  activeOrg: OrgSlug | null
  availableOrgs: OrgSlug[]
  switchOrg: (slug: OrgSlug) => Promise<void>
  isLoaded: boolean
}

export const OrgContext = createContext<OrgContextType | undefined>(undefined)

export const updateLastOrg = async (
  user: UserResource,
  slug: string
) => {
  await (user as unknown as {
    update: (data: { publicMetadata: Record<string, unknown> }) => Promise<void>
  }).update({
    publicMetadata: { lastOrg: slug },
  })
}

export const useOrgContext = () => {
  const ctx = useContext(OrgContext)
  if (!ctx) throw new Error("useOrgContext must be used within <OrgProvider>")
  return ctx
}
