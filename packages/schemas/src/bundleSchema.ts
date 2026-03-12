'use client'
import { z } from "zod";

// Define the bundle schema
export const bundleSchema = z.object({
  ksuid: z.string().optional().describe("ID of the bundle"),
  name: z.string().min(2, "Name must be at least 2 characters").describe("The name of the bundle"),
  description: z.string().min(10, "Description must be at least 10 characters").describe("A brief description of the bundle"),
  status: z.enum(["draft", "live", "archived"]).default("draft").describe("Status of the bundle"),
  primary_price: z.coerce.number().min(0, "Price must be a positive number").describe("Primary price in cents"),
  secondary_price: z.coerce.number().min(0, "Price must be a positive number").optional().describe("Secondary price in cents"),
  tertiary_price: z.coerce.number().min(0, "Price must be a positive number").optional().describe("Tertiary price in cents"),
  primary_price_name: z.string().min(2, "Price name must be at least 2 characters").describe("Name of the primary price tier"),
  secondary_price_name: z.string().min(2, "Price name must be at least 2 characters").optional().describe("Name of the secondary price tier"),
  tertiary_price_name: z.string().min(2, "Price name must be at least 2 characters").optional().describe("Name of the tertiary price tier"),
  pricing_schedule: z.record(z.any()).optional().describe("Pricing schedule configuration"),
  stripe_price_id: z.string().optional().describe("Stripe price ID"),
  stripe_primary_price_id: z.string().optional().describe("Stripe primary price ID"),
  stripe_secondary_price_id: z.string().optional().describe("Stripe secondary price ID"),
  stripe_tertiary_price_id: z.string().optional().describe("Stripe tertiary price ID"),
  stripe_product_id: z.string().optional().describe("Stripe product ID"),
  includes: z.string().array().min(1, "Must include at least one item").describe("Items included in this bundle"),
  entity_type: z.string().optional().describe("Entity type"),
  version: z.coerce.number().optional().describe("Version number"),
  meta: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
  created_at: z.string().optional().describe("Creation timestamp"),
  updated_at: z.string().optional().describe("Update timestamp"),
});

// Generate TypeScript type from the schema
export type ItemType = {name: string, status: string, ksuid: string, description: string, primary_price: number, primary_price_name: string, stripe_price_id?: string, parent_event_ksuid: string, event_slug?: string, entity_type: string };
export type BundleType = z.infer<typeof bundleSchema>;
export type BundleTypeExtended = BundleType & {
    ksuid: string, 
    event_slug?: string, 
    parent_event_ksuid: string,
    entity_type: string,
    status: string, 
    current_price?: () => string, 
    current_price_name?: () => string, 
    items?: () => ItemType[], 
    stripe_price_id?: string, 
    includes?: string[]
  };

// Additional no validation metadata relating to how we display data in forms
export const bundleMetadata = {
  ksuid: { hidden: true },
  description: { richText: false },
  status: { selectField: true },
  primary_price: { currencyField: true },
  secondary_price: { currencyField: true },
  tertiary_price: { currencyField: true },
  pricing_schedule: { hidden: true },
  stripe_price_id: { hidden: true },
  stripe_primary_price_id: { hidden: true },
  stripe_secondary_price_id: { hidden: true },
  stripe_tertiary_price_id: { hidden: true },
  stripe_product_id: { hidden: true },
  includes: { checkboxesField: true },
  entity_type: { hidden: true },
  version: { info: true },
  created_at: { info: true },
  updated_at: { info: true },
}