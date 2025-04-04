'use server'
import { clerkClient, auth } from '@clerk/nextjs/server'

export async function setLastOrg(slug: string) {
  console.log("slug",slug)
  const { userId } = await auth()
  console.log("userId",userId)
  if (!userId) throw new Error('Not authenticated')

  const clerk = await clerkClient()
  const response = await clerk.users.updateUserMetadata(userId, {
    publicMetadata: { lastOrg: slug },
  })
  console.log("response",response)
  
}