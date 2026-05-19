import React, { useState, useCallback, useEffect } from 'react'
import { useDropzone, FileRejection } from 'react-dropzone'
import { useAuth } from '@clerk/nextjs'
import { v4 as uuidv4 } from 'uuid'
import { MultiFileUploaderProps } from '../../types/form'
import CustomComponent from './CustomComponent'
import { MdCloudUpload, MdCheckCircle, MdError, MdClose } from 'react-icons/md'

type FileUploadState = {
  id: string
  file: File
  progress: number
  status: 'queued' | 'uploading' | 'done' | 'error'
  s3Key?: string
}

type BatchPresignedResponse = {
  url: string
  fields: Record<string, string>
}

const buildSafeUniqueFileName = (file: File): string => {
  const extension = file.name.split('.').pop() || 'bin'
  return `${uuidv4()}.${extension}`
}

const MultiFileUploader: React.FC<MultiFileUploaderProps> = ({
  label,
  name,
  entity,
  register,
  setValue,
  error,
  fieldSchema,
  uploadUrl,
}) => {
  const { getToken } = useAuth()
  const [uploads, setUploads] = useState<FileUploadState[]>([])

  const fieldPath = [
    entity?.entity_type ? entity.entity_type.toLowerCase() : null,
    entity?.ksuid ?? null,
    name,
  ]
    .filter(Boolean)
    .join('/')

  const updateUpload = useCallback(
    (id: string, updater: (upload: FileUploadState) => FileUploadState) => {
      setUploads((prev) => prev.map((u) => (u.id === id ? updater(u) : u)))
    },
    []
  )

  const requestBatchPresigned = useCallback(async (): Promise<BatchPresignedResponse> => {
    const token = await getToken()
    const res = await fetch(uploadUrl, {
      method: 'POST',
      body: JSON.stringify({
        action: 'POST',
        batch: true,
        fileType: 'image/*',
        fieldName: fieldPath,
      }),
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    })

    if (!res.ok) {
      throw new Error('Failed to get presigned URL')
    }

    return res.json()
  }, [fieldPath, getToken, uploadUrl])

  const uploadSingleFile = useCallback(
    async (entry: FileUploadState, batchPresigned: BatchPresignedResponse) => {
      updateUpload(entry.id, (u) => ({ ...u, status: 'uploading', progress: 0 }))

      const templateKey = String(batchPresigned.fields.key || '')
      const uploadFileName = buildSafeUniqueFileName(entry.file)
      const resolvedKey = templateKey.replace('${filename}', uploadFileName)

      const formData = new FormData()
      Object.entries(batchPresigned.fields).forEach(([k, v]) => formData.append(k, v))
      formData.set('key', resolvedKey)
      formData.set('Content-Type', entry.file.type || 'application/octet-stream')
      formData.append('file', entry.file)

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('POST', batchPresigned.url, true)

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 100)
            updateUpload(entry.id, (u) => ({ ...u, progress: percent }))
          }
        }

        xhr.onload = () => {
          if (xhr.status === 204 || xhr.status === 201) {
            updateUpload(entry.id, (u) => ({
              ...u,
              status: 'done',
              progress: 100,
              s3Key: resolvedKey,
            }))
            resolve()
          } else {
            reject(new Error('Upload failed'))
          }
        }

        xhr.onerror = () => reject(new Error('Network error'))
        xhr.send(formData)
      })
    },
    [updateUpload]
  )

  const uploadDroppedFiles = useCallback(
    async (entries: FileUploadState[]) => {
      if (!entries.length) return

      try {
        const batchPresigned = await requestBatchPresigned()
        for (const entry of entries) {
          try {
            await uploadSingleFile(entry, batchPresigned)
          } catch (err) {
            console.error('Upload error:', err)
            updateUpload(entry.id, (u) => ({ ...u, status: 'error' }))
          }
        }
      } catch (err) {
        console.error('Batch presigned request failed:', err)
        setUploads((prev) => {
          const failedIds = new Set(entries.map((entry) => entry.id))
          return prev.map((u) => (failedIds.has(u.id) ? { ...u, status: 'error' } : u))
        })
      }
    },
    [requestBatchPresigned, updateUpload, uploadSingleFile]
  )

  const onDrop = useCallback((acceptedFiles: File[], rejections: FileRejection[]) => {
    if (rejections.length > 0) {
      console.error('Some files were rejected', rejections)
    }
    const newEntries = acceptedFiles.map((file) => ({
      id: `${Date.now()}-${Math.random()}`,
      file,
      progress: 0,
      status: 'queued' as const,
    }))

    setUploads((prev) => [...prev, ...newEntries])
    void uploadDroppedFiles(newEntries)
  }, [uploadDroppedFiles])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    accept: { 'image/*': [] },
  })

  const removeFile = (id: string) => {
    setUploads((prev) => prev.filter((upload) => upload.id !== id))
  }

  useEffect(() => {
    const keys = uploads
      .filter((u) => u.status === 'done' && u.s3Key)
      .map((u) => u.s3Key as string)
    setValue(name, keys, { shouldDirty: true })
  }, [uploads, name, setValue])

  const isUploading = uploads.some((u) => u.status === 'uploading')

  return (
    <CustomComponent label={label} name={name} htmlFor={name} error={error} fieldSchema={fieldSchema}>
      {/* Hidden registration so react-hook-form tracks the field */}
      <input type="hidden" {...register(name)} />

      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg px-6 py-8 text-center cursor-pointer transition-colors ${
          isDragActive
            ? 'border-dark-background bg-gray-50'
            : 'border-gray-300 hover:border-dark-background'
        }`}
      >
        <input {...getInputProps()} />
        <MdCloudUpload className="mx-auto w-8 h-8 text-gray-400 mb-2" />
        <p className="text-sm text-gray-600">
          {isDragActive ? 'Drop photos here…' : 'Drag & drop photos here, or click to browse'}
        </p>
        <p className="text-xs text-gray-400 mt-1">Images only — uploads start automatically</p>
      </div>

      {/* File list */}
      {uploads.length > 0 && (
        <ul className="flex flex-col gap-2 mt-3">
          {uploads.map((u) => (
            <li
              key={u.id}
              className="flex items-center gap-3 rounded-md border border-gray-200 px-3 py-2 text-sm"
            >
              <span className="flex-1 truncate text-gray-800">{u.file.name}</span>

              {u.status === 'uploading' && (
                <div className="flex items-center gap-2 shrink-0">
                  <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-dark-background transition-all"
                      style={{ width: `${u.progress}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 w-8 text-right">{u.progress}%</span>
                </div>
              )}

              {u.status === 'done' && (
                <MdCheckCircle className="w-5 h-5 text-green-500 shrink-0" />
              )}

              {u.status === 'error' && (
                <MdError className="w-5 h-5 text-red-500 shrink-0" />
              )}

              {(u.status === 'queued' || u.status === 'error') && (
                <button
                  type="button"
                  onClick={() => removeFile(u.id)}
                  className="text-gray-400 hover:text-gray-600 shrink-0"
                  aria-label={`Remove ${u.file.name}`}
                >
                  <MdClose className="w-4 h-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {isUploading ? <p className="text-xs text-gray-500 mt-2">Uploading files...</p> : null}
    </CustomComponent>
  )
}

export default MultiFileUploader
