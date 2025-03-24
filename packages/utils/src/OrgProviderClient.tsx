'use client'
import { createContext, useContext, useEffect, useState, ReactNode } from "react"
import { useUser } from "@clerk/nextjs"
import type { UserResource } from "@clerk/types"

type OrgSlug = string

type OrgContextType = {
  activeOrg: OrgSlug | null
  availableOrgs: OrgSlug[]
  switchOrg: (slug: OrgSlug) => Promise<void>
  isLoaded: boolean
}

const OrgContext = createContext<OrgContextType | undefined>(undefined)

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


export const OrgProviderClient = ({ children }: { children: ReactNode }): ReactNode => {
  const { user, isLoaded: isUserLoaded } = useUser()
  const [activeOrg, setActiveOrg] = useState<OrgSlug | null>(null)
  const [availableOrgs, setAvailableOrgs] = useState<OrgSlug[]>([])
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    if (!isUserLoaded || !user) return

    const orgs = Object.keys(user.publicMetadata.organisations || {}) as OrgSlug[]
    setAvailableOrgs(orgs)

    const lastOrg = (user.publicMetadata.lastOrg || null) as string | null
    const isValid = lastOrg && orgs.includes(lastOrg)
    const resolvedOrg = isValid ? lastOrg : orgs.length === 1 ? orgs[0] : null
    setActiveOrg(resolvedOrg as string | null)
    setIsLoaded(true)
  }, [user, isUserLoaded])

  const switchOrg = async (slug: OrgSlug) => {
    if (!availableOrgs.includes(slug)) return
    setActiveOrg(slug)
    if(user) {
      console.log(user)
      await updateLastOrg(user, slug)
    }
    
  }

  return (
    <OrgContext.Provider value={{ activeOrg, availableOrgs, switchOrg, isLoaded }}>
      {children}
    </OrgContext.Provider>
  )
}

export const useOrgContext = () => {
  const ctx = useContext(OrgContext)
  if (!ctx) throw new Error("useOrgContext must be used within <OrgProvider>")
  return ctx
}
