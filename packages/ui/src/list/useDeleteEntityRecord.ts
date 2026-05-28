import { useAuth } from '@clerk/nextjs'

type UseDeleteEntityRecordParams = {
  entity: string
  activeOrg?: string
}

type DeleteRecordResult = {
  ok: boolean
  error?: string
}

export function useDeleteEntityRecord({
  entity,
  activeOrg,
}: UseDeleteEntityRecordParams) {
  const { getToken } = useAuth()

  const deleteRecord = async (record: Record<string, unknown>): Promise<DeleteRecordResult> => {
    const recordKsuid = String(record?.ksuid ?? '')
    if (!recordKsuid) {
      return { ok: false, error: 'Missing record ksuid.' }
    }

    if (!activeOrg) {
      return { ok: false, error: 'Missing active organization.' }
    }

    const token = await getToken()
    const entityTypeSlug = `${entity?.toLowerCase()}s`
    const apiBaseUrl = process.env.NEXT_PUBLIC_DANCE_ENGINE_API ?? ''
    if (!apiBaseUrl) {
      return { ok: false, error: 'Missing NEXT_PUBLIC_DANCE_ENGINE_API.' }
    }
    const entityApiUrl = `${apiBaseUrl}/${activeOrg}/${entityTypeSlug}`

    try {
      const response = await fetch(`${entityApiUrl}/${recordKsuid}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        return { ok: false, error: `Delete failed with status ${response.status}.` }
      }

      return { ok: true }
    } catch (err) {
      console.error('Error deleting entity:', err)
      return { ok: false, error: 'Delete request failed.' }
    }
  }

  return { deleteRecord }
}