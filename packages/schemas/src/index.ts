import { eventSchema, EventType } from './eventSchema'
import { customerSchema, CustomerType } from './customerSchema'
import { locationSchema, LocationType } from './locationSchema'
import { SafeParseReturnType, ZodTypeAny } from 'zod'

export const schemaRegistry = {
  "EVENT": eventSchema,
  "LOCATION": locationSchema,
  "CUSTOMER": customerSchema,
  // ...
} as const

export const validateEntity = <T extends EntityNameType>(
  type: T,
  data: unknown
): SafeParseReturnType<unknown, ReturnType<(typeof schemaRegistry)[T]['parse']>> => {
  const schema = schemaRegistry[type] as ZodTypeAny
  return schema.safeParse(data)
}

export type EntityNameType = keyof typeof schemaRegistry
export type EntityData<T extends EntityNameType> = ReturnType<(typeof schemaRegistry)[T]['parse']>
export type EntityType = EventType | CustomerType | LocationType