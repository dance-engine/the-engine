'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

export interface PhotoMetadata {
  file: string
  credit_name?: string
  credit_url?: string
}

interface CarouselProps {
  photos: PhotoMetadata[]
  cdnUrl: string
  eventKsuid: string
  orgSlug: string
}

const resolvePhotoUrl = (file: string, cdnUrl: string, eventKsuid: string, orgSlug: string) => {
  if (file.startsWith('http://') || file.startsWith('https://')) {
    return file
  }

  return `${cdnUrl}/cdn/${orgSlug}/event/${eventKsuid}/photos/${file}`
}

export const Carousel = ({ photos, cdnUrl, eventKsuid, orgSlug }: CarouselProps) => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [showOverlay, setShowOverlay] = useState(false)

  useEffect(() => {
    setIsLoading(false)
  }, [])

  if (!photos || photos.length === 0) {
    return (
      <div className="w-full flex items-center justify-center bg-gray-900 rounded-lg p-8 min-h-96">
        <p className="text-gray-400">No photos available</p>
      </div>
    )
  }

  const currentPhoto = photos[currentIndex]
  if (!currentPhoto) {
    return null
  }

  const photoUrl = resolvePhotoUrl(currentPhoto.file, cdnUrl, eventKsuid, orgSlug)
  const fullResUrl = photoUrl

  const goToPrevious = () => {
    setCurrentIndex((prevIndex) => (prevIndex === 0 ? photos.length - 1 : prevIndex - 1))
  }

  const goToNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex === photos.length - 1 ? 0 : prevIndex + 1))
  }

  const goToSlide = (index: number) => {
    setCurrentIndex(index)
  }

  if (isLoading) {
    return (
      <div className="w-full flex items-center justify-center bg-gray-900 rounded-lg p-8 min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="w-full flex flex-col items-start">
      {/* Overlay for full-res image */}
      {showOverlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <button
            className="absolute top-6 right-6 bg-black/60 hover:bg-black/80 text-white rounded-full p-2 z-60"
            onClick={() => setShowOverlay(false)}
            aria-label="Close full image"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <img
            src={fullResUrl}
            alt={`Full size photo ${currentIndex + 1}`}
            className="max-w-full max-h-[90vh] rounded-lg shadow-lg border border-white/10"
            style={{ objectFit: 'contain' }}
          />
        </div>
      )}

      {/* Main carousel */}
      <div
        className="relative w-full bg-black rounded-lg overflow-hidden aspect-video"
      >
        <Image
          src={photoUrl}
          alt={`Photo ${currentIndex + 1} by ${currentPhoto.credit_name || 'Unknown'}`}
          fill
          className="object-contain"
          priority
          onError={(e) => {
            console.error('Image failed to load:', photoUrl)
            e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 400 400\"%3E%3Crect fill=\"%23333\" width=\"400\" height=\"400\"/%3E%3Ctext x=\"50%25\" y=\"50%25\" text-anchor=\"middle\" dy=\".3em\" fill=\"%23666\" font-size=\"18\"%3EImage not available%3C/text%3E%3C/svg%3E'
          }}
        />

        <button
          type="button"
          className="absolute inset-0 z-0 cursor-zoom-in"
          onClick={() => setShowOverlay(true)}
          aria-label="View full size image"
        />

        {/* Navigation buttons */}
        {photos.length > 1 && (
          <>
            <button
              onClick={goToPrevious}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/75 text-white p-2 rounded-full transition-colors z-10"
              aria-label="Previous photo"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <button
              onClick={goToNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/75 text-white p-2 rounded-full transition-colors z-10"
              aria-label="Next photo"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}

        {/* Photo counter */}
        <div className="absolute top-4 right-4 bg-black/50 text-white px-3 py-1 rounded text-sm">
          {currentIndex + 1} / {photos.length}
        </div>
      </div>

      {/* Photo credits */}
      {(currentPhoto.credit_name || currentPhoto.credit_url) && (
        <div className="mt-4 text-sm">
          {currentPhoto.credit_url ? (
            <a
              href={currentPhoto.credit_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 underline"
            >
              Photo by {currentPhoto.credit_name || 'Photographer'}
            </a>
          ) : (
            <p className="text-gray-400">Photo by {currentPhoto.credit_name}</p>
          )}
        </div>
      )}

      {/* Thumbnail navigation */}
      {photos.length > 1 && (
        <div className="mt-6 flex gap-2 overflow-x-auto pb-2">
          {photos.map((photo, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`relative flex-shrink-0 rounded overflow-hidden transition-opacity ${
                index === currentIndex ? 'ring-2 ring-blue-400 opacity-100' : 'opacity-60 hover:opacity-80'
              }`}
              aria-label={`Go to photo ${index + 1}`}
            >
              <Image
                src={resolvePhotoUrl(photo.file, cdnUrl, eventKsuid, orgSlug)}
                alt={`Thumbnail ${index + 1}`}
                width={80}
                height={60}
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default Carousel
