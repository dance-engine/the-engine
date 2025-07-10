'use client'
import { z } from "zod";

// Define the event schema
export const organisationSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().min(2, "Name must be at least 2 characters"),
  organisation: z.string().min(2, "Slug must be at least 2 characters").max(50, "Slug must be less than 50 characters").regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with dashes"),
  status: z.enum(["draft","active","setup","suspended","archived"]).default("active").describe("Status of the organisation"),
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
  organisation: { info: true }, 
  created_at: { info: true },
  updated_at: { info: true },
  version: { info: true }
}