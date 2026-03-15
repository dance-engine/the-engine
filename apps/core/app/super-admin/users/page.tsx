import { currentUser } from "@clerk/nextjs/server"
import { nameFromHypenated } from "@dance-engine/utils/textHelpers"
import { notFound } from "next/navigation"

export const dynamic = "force-dynamic"

type UserOrganisations = Record<string, string[]>

type ClerkEmailAddress = {
  id: string
  email_address: string
}

type ClerkUser = {
  id: string
  first_name?: string | null
  last_name?: string | null
  full_name?: string | null
  username?: string | null
  image_url?: string | null
  profile_image_url?: string | null
  primary_email_address_id?: string | null
  email_addresses?: ClerkEmailAddress[]
  public_metadata?: {
    organisations?: UserOrganisations
    title?: string
  }
  created_at?: number
  last_sign_in_at?: number | null
  last_active_at?: number | null
  banned?: boolean
  locked?: boolean
}

const getDisplayName = (user: ClerkUser) => {
  const composedName = [user.first_name, user.last_name].filter(Boolean).join(" ").trim()
  return user.full_name || composedName || user.username || "Unnamed user"
}

const getPrimaryEmail = (user: ClerkUser) => {
  const primaryEmail = user.email_addresses?.find(
    (email) => email.id === user.primary_email_address_id
  )

  return primaryEmail?.email_address || user.email_addresses?.[0]?.email_address || "No email"
}

const getOrganisationLabels = (organisations: UserOrganisations | undefined) => {
  const orgKeys = Object.keys(organisations ?? {})

  if (orgKeys.length === 0) {
    return ["No organisation access"]
  }

  return orgKeys.map((orgSlug) =>
    orgSlug === "*" ? "All organisations" : nameFromHypenated(orgSlug)
  )
}

const formatTimestamp = (timestamp?: number | null) => {
  if (!timestamp) {
    return "Never"
  }

  return new Date(timestamp).toLocaleString()
}

const fetchClerkUsers = async () => {
  const clerkSecretKey = process.env.CLERK_SECRET_KEY

  if (!clerkSecretKey) {
    throw new Error("CLERK_SECRET_KEY is not configured")
  }

  const users: ClerkUser[] = []
  const limit = 100
  let offset = 0

  while (true) {
    const response = await fetch(
      `https://api.clerk.com/v1/users?limit=${limit}&offset=${offset}`,
      {
        headers: {
          Authorization: `Bearer ${clerkSecretKey}`,
        },
        cache: "no-store",
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to load Clerk users (${response.status})`)
    }

    const payload = await response.json()
    const pageUsers = Array.isArray(payload)
      ? (payload as ClerkUser[])
      : Array.isArray(payload?.data)
        ? (payload.data as ClerkUser[])
        : []

    users.push(...pageUsers)

    if (pageUsers.length < limit) {
      break
    }

    offset += pageUsers.length
  }

  return users
}

export default async function SuperAdminUsersPage() {
  const user = await currentUser()
  const organisations = user?.publicMetadata?.organisations as UserOrganisations | undefined
  const isSuperAdmin = Object.prototype.hasOwnProperty.call(organisations ?? {}, "*")

  if (!isSuperAdmin) {
    notFound()
  }

  let users: ClerkUser[] = []
  let loadError: string | null = null

  try {
    users = await fetchClerkUsers()
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Failed to load users"
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-base font-semibold text-gray-900 dark:text-dark-secondary">
            User Manager
          </h1>
          <p className="mt-2 text-sm text-gray-700 dark:text-primary-text">
            All Clerk users and the organisations they can access.
          </p>
        </div>
      </div>

      {loadError ? (
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {loadError}
        </div>
      ) : null}

      <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-dark-highlight dark:bg-uberdark-background">
        <div className="border-b border-gray-200 px-4 py-3 text-sm text-gray-600 dark:border-dark-highlight dark:text-primary-text">
          {users.length} user{users.length === 1 ? "" : "s"}
        </div>

        <ul role="list" className="divide-y divide-gray-200 dark:divide-dark-highlight">
          {users.map((listedUser) => {
            const displayName = getDisplayName(listedUser)
            const primaryEmail = getPrimaryEmail(listedUser)
            const accessibleOrgs = getOrganisationLabels(
              listedUser.public_metadata?.organisations
            )
            const profileImage =
              listedUser.image_url || listedUser.profile_image_url || undefined

            return (
              <li
                key={listedUser.id}
                className="flex flex-col gap-4 px-4 py-5 sm:px-6"
              >
                <div className="flex items-start gap-4">
                  {profileImage ? (
                    <img
                      src={profileImage}
                      alt={displayName}
                      className="h-14 w-14 rounded-full object-cover ring-1 ring-gray-200"
                    />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-dark-background text-sm font-semibold text-white">
                      {displayName.slice(0, 2).toUpperCase()}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h2 className="text-sm font-semibold text-gray-900 dark:text-dark-secondary">
                          {displayName}
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-primary-text">
                          {primaryEmail}
                        </p>
                        {listedUser.username ? (
                          <p className="text-xs text-gray-500 dark:text-primary-text">
                            @{listedUser.username}
                          </p>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {listedUser.banned ? (
                          <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
                            Banned
                          </span>
                        ) : null}
                        {listedUser.locked ? (
                          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
                            Locked
                          </span>
                        ) : null}
                        {!listedUser.banned && !listedUser.locked ? (
                          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                            Active
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <dl className="mt-4 grid gap-3 text-sm text-gray-700 dark:text-primary-text sm:grid-cols-2 xl:grid-cols-4">
                      <div>
                        <dt className="font-medium text-gray-500 dark:text-primary-text">
                          Organisations
                        </dt>
                        <dd className="mt-1 flex flex-wrap gap-2">
                          {accessibleOrgs.map((org) => (
                            <span
                              key={`${listedUser.id}-${org}`}
                              className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 dark:bg-dark-highlight dark:text-primary-text"
                            >
                              {org}
                            </span>
                          ))}
                        </dd>
                      </div>

                      <div>
                        <dt className="font-medium text-gray-500 dark:text-primary-text">
                          Joined
                        </dt>
                        <dd className="mt-1">{formatTimestamp(listedUser.created_at)}</dd>
                      </div>

                      <div>
                        <dt className="font-medium text-gray-500 dark:text-primary-text">
                          Last sign in
                        </dt>
                        <dd className="mt-1">{formatTimestamp(listedUser.last_sign_in_at)}</dd>
                      </div>

                      <div>
                        <dt className="font-medium text-gray-500 dark:text-primary-text">
                          User ID
                        </dt>
                        <dd className="mt-1 break-all text-xs">{listedUser.id}</dd>
                      </div>
                    </dl>

                    {listedUser.public_metadata?.title ? (
                      <p className="mt-3 text-sm text-gray-600 dark:text-primary-text">
                        Title: {listedUser.public_metadata.title}
                      </p>
                    ) : null}
                  </div>
                </div>
              </li>
            )
          })}

          {!loadError && users.length === 0 ? (
            <li className="px-4 py-6 text-sm text-gray-600 dark:text-primary-text">
              No users found.
            </li>
          ) : null}
        </ul>
      </div>
    </div>
  )
}
