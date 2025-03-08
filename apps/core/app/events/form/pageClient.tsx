'use client'

import DynamicForm from './eventForm'
import { eventSchema } from "@dance-engine/schemas/schema";

export default function PageClient() {
  return <DynamicForm schema={eventSchema} storageKey="eventFormData" />
}