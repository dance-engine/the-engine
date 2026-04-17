import { useAuth } from '@clerk/nextjs'

type UseArchiveEntityRecordParams = {
  entity: string
  activeOrg?: string
}

type ArchiveRecordResult = {
  ok: boolean
  error?: string
}

export function useArchiveEntityRecord({
  entity,
  activeOrg,
}: UseArchiveEntityRecordParams) {
  const { getToken } = useAuth()

  const archiveRecord = async (record: Record<string, unknown>): Promise<ArchiveRecordResult> => {
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
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ [entity?.toLowerCase()]: { ...record, status: 'archived' } }),
      })

      if (!response.ok) {
        return { ok: false, error: `Archive failed with status ${response.status}.` }
      }

      return { ok: true }
    } catch (err) {
      console.error('Error deleting entity:', err)
      return { ok: false, error: 'Archive request failed.' }
    }
  }

  return { archiveRecord }
}
