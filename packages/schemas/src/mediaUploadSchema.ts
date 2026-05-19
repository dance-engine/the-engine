import { z } from 'zod'

export const mediaUploadSchema = z.object({
  credit_name: z.string().min(1, 'Credit name is required').describe('Name of the photographer or source'),
  credit_url: z.string().optional().describe('Link to the photographer or source (optional)'),
  photos: z.array(z.string()).optional().describe('Select one or more photos to upload'),
})

export type MediaUploadType = z.infer<typeof mediaUploadSchema>
