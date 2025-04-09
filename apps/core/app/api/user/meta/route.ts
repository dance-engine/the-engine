import { NextResponse } from "next/server";
import { auth, clerkClient } from '@clerk/nextjs/server'

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) throw new Error('Not authenticated')
  const { slug } = await req.json()
  const clerk = await clerkClient()
  const response = await clerk.users.updateUserMetadata(userId, {
    publicMetadata: { lastOrg: slug },
  })
  return NextResponse.json(response)
}
