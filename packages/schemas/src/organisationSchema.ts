'use client'
import { log } from "console";
import { z } from "zod";

// Define the event schema
export const organisationSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  account_id: z.string().optional().describe("The account ID of the organisation"),
  banner: z.string().optional().describe('Appears at the top of your page'),
  banner_overlay: z.string().optional().describe('Optional overlay image for the banner to improve text visibility'),
  logo: z.string().optional().describe('Appears in the top left of your page'),
  logo_secondary_url: z.string().optional().describe("Secondary URL to the logo image for the organisation"),
  logo_icon_url: z.string().optional().describe("URL to the icon version of the logo for the organisation"),
  colour_primary: z.string().optional().describe("Primary colour for the organisation"),
  colour_primary_dark: z.string().optional().describe("Darker shade of the primary colour for the organisation"),
  colour_primary_light: z.string().optional().describe("Lighter shade of the primary colour for the organisation"),
  colour_secondary: z.string().optional().describe("Secondary colour for the organisation"),
  colour_secondary_dark: z.string().optional().describe("Darker shade of the secondary colour for the organisation"),
  colour_secondary_light: z.string().optional().describe("Lighter shade of the secondary colour for the organisation"),
  colour_background: z.string().optional().describe("Background colour for the organisation"),
  colour_background_alt: z.string().optional().describe("Alternative background colour for the organisation"),
  colour_text_primary: z.string().optional().describe("Primary text colour for the organisation"),
  colour_text_secondary: z.string().optional().describe("Secondary text colour for the organisation"),
  colour_text_inverted: z.string().optional().describe("Inverted text colour for the organisation"),
  css_vars: z.string().optional().describe('CSS variables for the organisation used to customise SOLO templates'),
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
  // account_id: { info: true },
  banner: { fileUploadField: 'single' },
  banner_overlay: { fileUploadField: 'single' },
  logo: { fileUploadField: 'single' },
  logo_secondary_url: { fileUploadField: 'single' },
  logo_icon_url: { fileUploadField: 'single' },
  css_vars: { info: true },
  description: { richText: true },
  organisation: { info: true }, 
  account_id: { onceOnly: true }, 
  created_at: { info: true },
  updated_at: { info: true },
  version: { info: true }
}
