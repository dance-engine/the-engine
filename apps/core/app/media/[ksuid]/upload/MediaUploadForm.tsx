'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FieldValues } from 'react-hook-form'
import { useAuth } from '@clerk/nextjs'
import { useOrgContext } from '@dance-engine/utils/OrgContext'
import DynamicForm from '@dance-engine/ui/form/DynamicForm'
import { MetaData } from '@dance-engine/ui/types'
import { mediaUploadSchema } from '@dance-engine/schemas'

const metadata: MetaData = {
  photos: { multiFileUploadField: true },
}

type Props = {
  eventKsuid: string
}

const MediaUploadForm = ({ eventKsuid }: Props) => {
  const { getToken } = useAuth()
  const { activeOrg } = useOrgContext()
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (data: FieldValues) => {
    setSubmitting(true)
    setError(null)
    
    try {
      // Photos are already uploaded to S3 by MultiFileUploader — this receives the S3 keys
      const payload = {
        event_ksuid: eventKsuid,
        photos: data.photos || [],
        credit_name: data.credit_name,
        credit_url: data.credit_url,
      }

      const apiBaseUrl = process.env.NEXT_PUBLIC_DANCE_ENGINE_API
      const token = await getToken()
      if (!token) {
        throw new Error('Missing authentication token. Please sign in again.')
      }

      const response = await fetch(`${apiBaseUrl}/${activeOrg}/media/process-uploads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to process media uploads')
      }

      const result = await response.json()
      console.log('Media upload processing triggered successfully', result)
      setSuccess(true)
      
      // Navigate back to media list after 2 seconds
      setTimeout(() => {
        router.push(`/media`)
      }, 1500)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred while processing uploads'
      console.error('Error processing media uploads:', err)
      setError(errorMessage)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="w-full">
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800 font-medium">Error</p>
          <p className="text-red-700 text-sm mt-1">{error}</p>
        </div>
      )}
      
      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
          <p className="text-green-800 font-medium">Success!</p>
          <p className="text-green-700 text-sm mt-1">Your photos have been uploaded successfully. Redirecting...</p>
        </div>
      )}

      <div className={success || submitting ? 'opacity-50 pointer-events-none' : ''}>
        <DynamicForm
          schema={mediaUploadSchema}
          metadata={metadata}
          onSubmit={handleSubmit}
          orgSlug={activeOrg ?? ''}
          data={{ photos: [], credit_name: '', credit_url: '' }}
        />
      </div>
      
      {submitting && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
          <p className="text-sm text-gray-600">Processing your upload...</p>
        </div>
      )}
    </div>
  )
}

export default MediaUploadForm
