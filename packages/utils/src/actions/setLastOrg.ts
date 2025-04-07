'use server'
import { clerkClient, auth } from '@clerk/nextjs/server'

export async function setLastOrg(slug: string) {
  const { userId } = await auth()
  if (!userId) throw new Error('Not authenticated')

  const clerk = await clerkClient()
  const response = await clerk.users.updateUserMetadata(userId, {
    publicMetadata: { lastOrg: slug },
  })
  return response  
}