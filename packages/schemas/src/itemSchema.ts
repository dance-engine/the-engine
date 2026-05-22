'use client'
import { z } from "zod";

// Define the item schema
export const itemSchema = z.object({
  ksuid: z.string().optional().describe("ID of the item"),
  name: z.string().min(2, "Name must be at least 2 characters").describe("The name of the item"),
  description: z.string().min(10, "Description must be at least 10 characters").optional().describe("A brief description of the item"),
  status: z.enum(["draft", "live", "archived"]).default("draft").describe("Status of the item"),
  individually_purchaseable: z.boolean().optional().describe("Whether this item can be purchased on its own"),
  primary_price: z.coerce.number().min(0, "Price must be a positive number").optional().describe("Primary price in cents"),
  secondary_price: z.coerce.number().min(0, "Price must be a positive number").optional().describe("Secondary price in cents"),
  tertiary_price: z.coerce.number().min(0, "Price must be a positive number").optional().describe("Tertiary price in cents"),
  primary_price_name: z.string().min(2, "Price name must be at least 2 characters").optional().describe("Name of the primary price tier"),
  secondary_price_name: z.string().min(2, "Price name must be at least 2 characters").optional().describe("Name of the secondary price tier"),
  tertiary_price_name: z.string().min(2, "Price name must be at least 2 characters").optional().describe("Name of the tertiary price tier"),
  pricing_schedule: z.record(z.any()).optional().describe("Pricing schedule configuration"),
  stripe_price_id: z.string().optional().describe("Stripe price ID"),
  stripe_primary_price_id: z.string().optional().describe("Stripe primary price ID"),
  stripe_secondary_price_id: z.string().optional().describe("Stripe secondary price ID"),
  stripe_tertiary_price_id: z.string().optional().describe("Stripe tertiary price ID"),
  stripe_product_id: z.string().optional().describe("Stripe product ID"),
  entity_type: z.string().optional().describe("Entity type"),
  version: z.coerce.number().optional().describe("Version number"),
  meta: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
  created_at: z.string().optional().describe("Creation timestamp"),
  updated_at: z.string().optional().describe("Update timestamp"),
});

export type ItemSchemaType = z.infer<typeof itemSchema>;
export type ItemTypeExtended = ItemSchemaType & {
  ksuid: string;
  event_slug?: string;
  parent_event_ksuid: string;
  entity_type: string;
  status: string;
  stripe_price_id?: string;
};

// Additional no-validation metadata relating to how we display data in forms
export const itemMetadata = {
  ksuid: { hidden: true },
  description: { richText: false },
  status: { hidden: true },
  individually_purchaseable: { checkboxField: true },
  primary_price: { currencyField: true },
  stripe_primary_price_id: { hidden: true },
  secondary_price: { currencyField: true },
  stripe_secondary_price_id: { hidden: true },
  tertiary_price_name: { hidden: true },
  tertiary_price: { currencyField: true, hidden: true },
  pricing_schedule: { hidden: true },
  stripe_price_id: { hidden: true },
  stripe_tertiary_price_id: { hidden: true },
  stripe_product_id: { hidden: true },
  entity_type: { hidden: true },
  version: { info: true },
  created_at: { info: true },
  updated_at: { info: true },
}
