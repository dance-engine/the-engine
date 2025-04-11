'use client'
import { z } from "zod";

// Define the event schema
export const customerSchema = z.object({
  ksuid: z.string().describe("ID of the event").optional(),
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().min(2, "Name must be at least 2 characters"),
  bio: z.string().describe("About this person"),
  meta: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
  created_at: z.string().refine((val) => { return val !== undefined || !isNaN(Date.parse(val))}, {
    message: "Invalid date or time",
  }).optional().describe("Updated timstamp"),
  updated_at: z.string().refine((val) => { return val !== undefined || !isNaN(Date.parse(val))}, {
    message: "Invalid date or time",
  }).optional().describe("Updated timstamp"),
  version: z.coerce.number().optional().describe("Version Number")
});

// Generate TypeScript type from the schema
export type CustomerType = z.infer<typeof customerSchema>;

// Additional no validation metadata relating to how we display data in forms
export const customerMetadata = {
  ksuid: { hidden: true },
  bio: { richText: true },
  created_at: { info: true },
  updated_at: { info: true },
  version: { info: true }
}