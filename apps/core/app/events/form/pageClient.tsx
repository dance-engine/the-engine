'use client'

import DynamicForm from '@dance-engine/ui/form/DynamicForm'
import { eventSchema } from "@dance-engine/schemas/schema";

export default function PageClient() {
  return <DynamicForm 
    schema={eventSchema} 
    storageKey="eventFormData" 
    initialLocation={{ lat: 51.505, lng: -0.09 }} // ✅ Now separate from schema
  />
}