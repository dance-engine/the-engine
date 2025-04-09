'use client'
import { useEffect, useState } from "react"
import type { FC, PropsWithChildren } from "react"
import { useUser } from "@clerk/nextjs"
import { OrgContext, updateLastOrg } from "./hooks/OrgContext"
import type { OrgSlug } from "./hooks/OrgContext"
import { } from './init/globalState';


export const OrgProviderClient: FC<PropsWithChildren> = ({ children }) => {

// export const OrgProviderClient = ({ children }: { children: ReactNode }): ReactNode => {
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
      await updateLastOrg(slug)
    }
    
  }

  return (
    <OrgContext.Provider value={{ activeOrg, availableOrgs, switchOrg, isLoaded }}>
      {children}
    </OrgContext.Provider>
  )
}