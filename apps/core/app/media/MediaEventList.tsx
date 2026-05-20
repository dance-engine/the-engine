'use client'
import useClerkSWR, { CorsError } from '@dance-engine/utils/clerkSWR'
import { useOrgContext } from '@dance-engine/utils/OrgContext'
import Spinner from '@dance-engine/ui/general/Spinner'
import { IoCloudOffline } from 'react-icons/io5'
import { EventType } from '@dance-engine/schemas/events'
import Link from 'next/link'
import ActionIconButton from '@dance-engine/ui/actions/ActionIconButton'
import { MdCloudUpload, MdPhotoLibrary } from 'react-icons/md'
import { useMemo } from 'react'
import { useLayoutSearch } from '../components/LayoutSearchContext'

const statusStyles: Record<string, string> = {
  live:     'bg-green-500',
  archived: 'bg-blue-500',
  draft:    'bg-gray-400',
  outdated: 'bg-amber-400',
}

const StatusBubble = ({ status }: { status?: string }) => {
  const colour = statusStyles[status ?? ''] ?? 'bg-gray-300'
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium text-white ${colour}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-white/60 inline-block" />
      {status ?? 'unknown'}
    </span>
  )
}

const MediaEventList = () => {
  const { activeOrg } = useOrgContext()
  const apiUrl = activeOrg ? `${process.env.NEXT_PUBLIC_DANCE_ENGINE_API}/${activeOrg}/events` : null
  const { data, error, isLoading } = useClerkSWR(apiUrl, { suspense: false })

  const events: EventType[] = data?.events ?? []
  const { debouncedQuery } = useLayoutSearch()
  const filteredEvents = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase()
    if (!q) return events
    return events.filter(e =>
      e.name.toLowerCase().includes(q) ||
      (e.status || '').toLowerCase().includes(q)
    )
  }, [events, debouncedQuery])

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-4 py-4 text-gray-500">
        <Spinner className="w-4 h-4" /> Loading events…
      </div>
    )
  }

  if (error instanceof CorsError) {
    return (
      <div className="px-4 py-4 bg-red-800 text-white">
        Looks like a CORS issue (server unreachable or blocked)
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 px-4 py-4 bg-red-800 text-white">
        <IoCloudOffline className="w-5 h-5" /> Failed to load events
      </div>
    )
  }

  if (!filteredEvents.length) {
    return (
      <p className="px-4 lg:px-8 py-6 text-sm text-gray-500">No events found.</p>
    )
  }

  return (
    <ul className="mt-4 w-full divide-y divide-gray-200 border-t border-gray-200">
      {filteredEvents.map((event) => (
        <li key={event.ksuid}>
          <div className="flex items-center justify-between px-4 lg:px-8 py-4 hover:bg-gray-50 transition-colors">
            <span className="text-sm font-medium text-gray-900">{event.name}</span>
            <div className="flex items-center gap-3">
              <StatusBubble status={event.status} />
              <ActionIconButton
                href={`/media/${event.ksuid}/upload`}
                label="Upload media"
                record_label={`for ${event.name}`}
                icon={<MdCloudUpload className="h-5 w-5" />}
              />
              <ActionIconButton
                href={`/media/${event.ksuid}`}
                label="View media"
                record_label={`for ${event.name}`}
                icon={<MdPhotoLibrary className="h-5 w-5" />}
              />
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}

export default MediaEventList
