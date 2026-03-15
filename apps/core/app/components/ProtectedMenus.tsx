'use client'

import { useUser } from '@clerk/nextjs'
import MobileMenu from '@dance-engine/ui/menu/MobileMenu'
import MainMenu from '@dance-engine/ui/menu/MainMenu'
import { getMenuContents } from '../menuContents'

const ProtectedMenus = () => {
  const { user } = useUser()
  const organisations = user?.publicMetadata?.organisations as Record<string, string[]> | undefined
  const isSuperAdmin = Object.prototype.hasOwnProperty.call(organisations ?? {}, '*')
  const menuContents = getMenuContents(isSuperAdmin)

  return (
    <>
      <MobileMenu menuContents={menuContents} />
      <MainMenu menuContents={menuContents} />
    </>
  )
}

export default ProtectedMenus
