'use client'
import { z } from "zod";

// Define the event schema
export const organisationSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().min(2, "Name must be at least 2 characters"),
  created_at: z.string().refine((val) => { return val !== undefined || !isNaN(Date.parse(val))}, {
    message: "Invalid date or time",
  }).optional().describe("Updated timstamp"),
  updated_at: z.string().refine((val) => { return val !== undefined || !isNaN(Date.parse(val))}, {
    message: "Invalid date or time",
  }).optional().describe("Updated timstamp"),
  version: z.coerce.number().optional().describe("Version Number")
});

// Generate TypeScript type from the schema
export type OrganisationType = z.infer<typeof organisationSchema>;

// Additional no validation metadata relating to how we display data in forms
export const organisationMetadata = {
  description: { richText: true },
  created_at: { info: true },
  updated_at: { info: true },
  version: { info: true }
}