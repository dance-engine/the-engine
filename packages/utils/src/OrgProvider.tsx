'use client'

import { OrgProviderClient } from './OrgProviderClient.js'

export const OrgProvider = ({ children }: { children: React.ReactNode }) => {
  return <OrgProviderClient>{children}</OrgProviderClient>
}