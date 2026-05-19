'use client'

import { useEffect, useState } from 'react'
import Carousel, { PhotoMetadata } from '@dance-engine/ui/general/Carousel'

type Props = {
  eventKsuid: string
  orgSlug: string
}

const MediaGalleryClient = ({ eventKsuid, orgSlug }: Props) => {
  const cdnUrl = process.env.NEXT_PUBLIC_CDN_URL || ''
  const [photos, setPhotos] = useState<PhotoMetadata[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isActive = true

    const loadMetadata = async () => {
      if (orgSlug === 'default-org') {
        if (isActive) {
          setError('Organisation is still loading.')
          setLoading(false)
        }
        return
      }

      if (!cdnUrl) {
        if (isActive) {
          setError('CDN is not configured for this app.')
          setLoading(false)
        }
        return
      }

      try {
        const metadataUrl = `${cdnUrl}/${orgSlug}/event/${eventKsuid}/photos/metadata.json`
        const response = await fetch(metadataUrl, { cache: 'no-store' })

        if (!isActive) {
          return
        }

        if (response.ok) {
          const metadata = await response.json()
          setPhotos(Array.isArray(metadata) ? metadata : [])
          setError(null)
        } else if (response.status === 404) {
          setPhotos([])
          setError('No photos available for this event yet.')
        } else {
          setError('Failed to load photos. Please try again later.')
        }
      } catch (fetchError) {
        console.error('Error fetching metadata:', fetchError)
        if (isActive) {
          setError('Failed to load photos. Please try again later.')
        }
      } finally {
        if (isActive) {
          setLoading(false)
        }
      }
    }

    loadMetadata()

    return () => {
      isActive = false
    }
  }, [cdnUrl, eventKsuid, orgSlug])

  if (loading) {
    return (
      <div className="bg-gray-900 rounded-lg p-8 text-center">
        <p className="text-gray-400">Loading photos...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-6 text-center">
        <p className="text-red-200">{error}</p>
      </div>
    )
  }

  if (photos.length === 0) {
    return (
      <div className="bg-gray-900 rounded-lg p-8 text-center">
        <p className="text-gray-400">No photos available.</p>
      </div>
    )
  }

  return (
    <div>
      <Carousel photos={photos} cdnUrl={cdnUrl} eventKsuid={eventKsuid} orgSlug={orgSlug} />
      <div className="mt-6 text-sm text-gray-400">
        <p>Total photos: {photos.length}</p>
      </div>
    </div>
  )
}

export default MediaGalleryClient