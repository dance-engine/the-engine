import { currentUser } from "@clerk/nextjs/server"
import { notFound } from "next/navigation"

export default async function SuperAdminUsersPage() {
  const user = await currentUser()
  const organisations = user?.publicMetadata?.organisations as Record<string, string[]> | undefined
  const isSuperAdmin = Object.prototype.hasOwnProperty.call(organisations ?? {}, "*")

  if (!isSuperAdmin) {
    notFound()
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-dark-secondary">
        User Manager
      </h1>
      <p className="mt-2 text-sm text-gray-600 dark:text-primary-text">
        This page is intentionally blank for now.
      </p>
    </div>
  )
}
