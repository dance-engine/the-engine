'use client'
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useOrgContext } from '@dance-engine/utils/OrgContext'
import Spinner from '@dance-engine/ui/general/Spinner'
import { MdDeleteOutline, MdCheck, MdClose } from 'react-icons/md'

type PhotoEntry = {
  file: string
  credit_name?: string
  credit_url?: string
}

type Props = {
  eventKsuid: string
}

const cdnUrl = process.env.NEXT_PUBLIC_CDN_URL ?? ''
const apiUrl = process.env.NEXT_PUBLIC_DANCE_ENGINE_API ?? ''

// Helper: convert CDN URL to S3 key
function cdnUrlToS3Key(url: string, org: string, eventKsuid: string) {
  // Handles both prod and preview CDN URLs
  // Looks for /{org}/event/{eventKsuid}/photos/...
  const idx = url.indexOf(`/${org}/event/${eventKsuid}/photos/`)
  if (idx === -1) return url // fallback: send as-is (will 403)
  return `cdn/${org}/event/${eventKsuid}/photos/` + url.slice(idx + (`/${org}/event/${eventKsuid}/photos/`).length)
}

const MediaPhotoList = ({ eventKsuid }: Props) => {
  const { getToken } = useAuth()
  const { activeOrg } = useOrgContext()
  const [photos, setPhotos] = useState<PhotoEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const metadataUrl = activeOrg
    ? `${cdnUrl}/${activeOrg}/event/${eventKsuid}/photos/metadata.json`
    : null

  const fetchPhotos = useCallback(async () => {
    if (!metadataUrl) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${metadataUrl}?t=${Date.now()}`)
      if (res.status === 403 || res.status === 404) {
        setPhotos([])
        return
      }
      if (!res.ok) throw new Error(`Failed to load photos (${res.status})`)
      const data = await res.json()
      setPhotos(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load photos')
    } finally {
      setLoading(false)
    }
  }, [metadataUrl])

  useEffect(() => {
    fetchPhotos()
  }, [fetchPhotos])

  const handleConfirmDelete = async (photo: PhotoEntry) => {
    if (!activeOrg) return
    setConfirming(null)
    setDeleting(photo.file)
    try {
      const token = await getToken()
      if (!token) throw new Error('Missing authentication token')
      // Convert CDN URL to S3 key for backend
      const fileKey = cdnUrlToS3Key(photo.file, activeOrg, eventKsuid)
      const res = await fetch(`${apiUrl}/${activeOrg}/media/event/${eventKsuid}/photo`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ file: fileKey }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.message || `Delete failed (${res.status})`)
      }
      setPhotos((prev) => prev.filter((p) => p.file !== photo.file))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete photo')
    } finally {
      setDeleting(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8 text-gray-500">
        <Spinner className="w-4 h-4" /> Loading photos…
      </div>
    )
  }

  if (error) {
    return <p className="py-8 text-sm text-red-600">{error}</p>
  }

  if (!photos.length) {
    return <p className="py-8 text-sm text-gray-500">No photos uploaded yet.</p>
  }

  return (
    <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
      {photos.map((photo) => {
        const imgSrc = photo.file
        const isConfirming = confirming === photo.file
        const isDeleting = deleting === photo.file
        return (
          <li key={photo.file} className="relative group rounded-lg overflow-hidden bg-gray-100 aspect-square">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imgSrc}
              alt={photo.credit_name || 'Event photo'}
              className="w-full h-full object-cover cursor-pointer"
              onClick={() => !isConfirming && !isDeleting && setConfirming(photo.file)}
            />

            {/* Credit label */}
            {photo.credit_name && !isConfirming && (
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs px-2 py-1 truncate">
                {photo.credit_url ? (
                  <a href={photo.credit_url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                    {photo.credit_name}
                  </a>
                ) : (
                  photo.credit_name
                )}
              </div>
            )}

            {/* Confirm overlay */}
            {isConfirming && (
              <div className="absolute inset-0 bg-red-600/60 flex flex-col items-center justify-center gap-3">
                <p className="text-white text-xs font-semibold text-center px-2">Delete this photo?</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleConfirmDelete(photo)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-white text-red-600 text-xs font-semibold rounded-full hover:bg-red-50"
                  >
                    <MdCheck className="w-3.5 h-3.5" /> Delete
                  </button>
                  <button
                    onClick={() => setConfirming(null)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-white/20 text-white text-xs font-semibold rounded-full hover:bg-white/30"
                  >
                    <MdClose className="w-3.5 h-3.5" /> Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Deleting spinner overlay */}
            {isDeleting && (
              <div className="absolute inset-0 bg-red-600/60 flex items-center justify-center">
                <Spinner className="w-6 h-6 text-white" />
              </div>
            )}

            {/* Delete trigger button */}
            {!isConfirming && !isDeleting && (
              <button
                onClick={() => setConfirming(photo.file)}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-white/80 hover:bg-red-100 text-gray-600 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Delete photo"
              >
                <MdDeleteOutline className="w-4 h-4" />
              </button>
            )}
          </li>
        )
      })}
    </ul>
  )
}

export default MediaPhotoList
