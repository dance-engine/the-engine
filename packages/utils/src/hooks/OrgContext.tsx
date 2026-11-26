'use client'
import { createContext, useContext } from "react"
import { OrgProviderClient } from '../OrgProviderClient'

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
  slug: string
) => {
  // Awaited so callers can refresh server-rendered pages once Clerk has the new org.
  const response = await fetch('/api/user/meta',{
    method: 'POST',
    body: JSON.stringify({ slug })
  })
  if (!response.ok) {
    console.error('Failed to save last organisation', response.status)
  }
}

export const useOrgContext = () => {
  const ctx = useContext(OrgContext)
  if (!ctx) throw new Error("useOrgContext must be used within <OrgProvider>")
  return ctx
}
