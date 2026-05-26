'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import useSWR from 'swr'

type MediaMetadataEntry = {
  file: string
  credit_name?: string
  credit_url?: string
}

type MediaFilmStripProps = {
  orgSlug: string
  previousEventKsuid?: string
}

const FILM_STRIP_SCROLL_SPEED_PX_PER_SECOND = 12

const fetcher = async (url: string): Promise<MediaMetadataEntry[]> => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to load media metadata (${response.status})`)
  }
  const payload = await response.json()
  return Array.isArray(payload) ? payload : []
}

const resolvePhotoUrl = (
  file: string,
  cdnBaseUrl: string,
  orgSlug: string,
  eventKsuid: string,
) => {
  if (file.startsWith('http://') || file.startsWith('https://')) {
    return file
  }
  return `${cdnBaseUrl}/cdn/${orgSlug}/event/${eventKsuid}/photos/${file}`
}

const MediaFilmStrip = ({
  orgSlug,
  previousEventKsuid,
}: MediaFilmStripProps) => {
  const cdnBaseUrl = process.env.NEXT_PUBLIC_CDN_URL
  if (!cdnBaseUrl) {
    return null
  }
  const normalizedCdnBase = cdnBaseUrl.replace(/\/$/, '')
  const metadataUrl = previousEventKsuid
    ? `${normalizedCdnBase}/${orgSlug}/event/${previousEventKsuid}/photos/metadata.json`
    : null

  const { data, error, isLoading } = useSWR<MediaMetadataEntry[]>(metadataUrl, fetcher)
  const trackRef = useRef<HTMLUListElement | null>(null)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null)
  const [animationDurationSeconds, setAnimationDurationSeconds] = useState<number | null>(null)
  const [isHovered, setIsHovered] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches)
    updatePreference()

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', updatePreference)
      return () => mediaQuery.removeEventListener('change', updatePreference)
    }

    mediaQuery.addListener(updatePreference)
    return () => mediaQuery.removeListener(updatePreference)
  }, [])

  const shouldAutoScroll = Boolean(data && data.length > 0 && !prefersReducedMotion)
  const isPaused = isHovered || Boolean(selectedImageUrl)
  const loopedEntries = useMemo(() => {
    if (!data) return []
    return shouldAutoScroll ? [...data, ...data] : data
  }, [data, shouldAutoScroll])

  useEffect(() => {
    if (!shouldAutoScroll) {
      setAnimationDurationSeconds(null)
      return
    }

    const updateDuration = () => {
      const track = trackRef.current
      if (!track) return

      const singleLoopWidth = track.scrollWidth / 2
      if (singleLoopWidth <= 0) return

      setAnimationDurationSeconds(singleLoopWidth / FILM_STRIP_SCROLL_SPEED_PX_PER_SECOND)
    }

    updateDuration()

    const track = trackRef.current
    if (!track || typeof ResizeObserver === 'undefined') {
      return
    }

    const resizeObserver = new ResizeObserver(() => {
      updateDuration()
    })

    resizeObserver.observe(track)
    return () => {
      resizeObserver.disconnect()
    }
  }, [shouldAutoScroll, loopedEntries.length])

  useEffect(() => {
    if (!selectedImageUrl) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedImageUrl(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedImageUrl])

  if (!previousEventKsuid) {
    return null
  }

  if (isLoading) {
    return (
      <section className="overflow-x-auto">
        <ul className="flex min-w-max gap-0">
          {Array.from({ length: 6 }).map((_, index) => (
            <li
              key={`media-filmstrip-skeleton-${index}`}
              className="h-72 w-96 shrink-0 animate-pulse"
              style={{ backgroundColor: 'var(--scheme-surface-border)' }}
            />
          ))}
        </ul>
      </section>
    )
  }

  if (error || !data || data.length === 0) {
    return null
  }

  return (
    <>
      <style>{`
        @keyframes media-film-strip-marquee {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }
      `}</style>

      <section
        className={shouldAutoScroll ? 'overflow-hidden' : 'overflow-x-auto'}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div>
          <ul
            ref={trackRef}
            className="flex min-w-max gap-0"
            style={shouldAutoScroll && animationDurationSeconds
              ? {
                  animationName: 'media-film-strip-marquee',
                  animationDuration: `${animationDurationSeconds}s`,
                  animationTimingFunction: 'linear',
                  animationIterationCount: 'infinite',
                  animationPlayState: isPaused ? 'paused' : 'running',
                }
              : undefined}
          >
            {loopedEntries.map((entry, index) => {
              const imageUrl = resolvePhotoUrl(entry.file, normalizedCdnBase, orgSlug, previousEventKsuid)
              return (
                <li
                  key={`${entry.file}-${index}`}
                  className="relative h-72 shrink-0"
                  style={{ backgroundColor: 'var(--scheme-page-bg-start)' }}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedImageUrl(imageUrl)}
                    className="block h-full cursor-zoom-in"
                    aria-label={`Open previous event photo ${index + 1}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imageUrl}
                      alt={`Previous event photo ${index + 1}`}
                      loading="lazy"
                      className="h-full w-auto max-w-none object-contain"
                    />
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      </section>

      {selectedImageUrl ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          onClick={() => setSelectedImageUrl(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Expanded previous event image"
        >
          <button
            type="button"
            className="absolute right-4 top-4 rounded-full bg-black/50 px-3 py-2 text-sm text-white"
            onClick={() => setSelectedImageUrl(null)}
            aria-label="Close image modal"
          >
            Close
          </button>
          <div className="max-h-[90vh] max-w-[92vw]" onClick={(event) => event.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selectedImageUrl}
              alt="Expanded previous event"
              className="max-h-[90vh] max-w-[92vw] object-contain"
            />
          </div>
        </div>
      ) : null}
    </>
  )
}

export default MediaFilmStrip