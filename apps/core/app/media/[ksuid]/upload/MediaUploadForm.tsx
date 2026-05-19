'use client'
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

  const handleSubmit = async (data: FieldValues) => {
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
        const error = await response.json()
        throw new Error(error.message || 'Failed to process media uploads')
      }

      const result = await response.json()
      console.log('Media upload processing triggered successfully', result)
      // TODO: Show success message to user
    } catch (error) {
      console.error('Error processing media uploads:', error)
      // TODO: Show error message to user
    }
  }

  return (
    <DynamicForm
      schema={mediaUploadSchema}
      metadata={metadata}
      onSubmit={handleSubmit}
      orgSlug={activeOrg ?? ''}
    />
  )
}

export default MediaUploadForm
