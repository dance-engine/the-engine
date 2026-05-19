'use client'
import { FieldValues } from 'react-hook-form'
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
  const { activeOrg } = useOrgContext()

  const handleSubmit = (data: FieldValues) => {
    // photos are already uploaded to S3 by MultiFileUploader — this receives the s3 keys
    console.log('Media upload submitted', { eventKsuid, activeOrg, ...data })
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
