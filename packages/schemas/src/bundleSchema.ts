'use client'
import { z } from "zod";

// Define the event schema
export const bundleSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").describe("The name of the event."),
  description: z.string().min(10, "Description must be at least 10 characters").describe("A brief description of the event."), //TODO This should deal with the fact it's a JSON  
  category: z.enum(["congress", "workshop", "party", "class"]).array().min(1,"Must have at least one category").describe("Category"),
  includes: z.string().array().min(1,"Must have at least one include").describe("Includes these items"),  
  primary_price: z.number().min(0, "Primary price must be a positive number").describe("The primary price of the bundle."),
  primary_price_name: z.string().min(2, "Primary price name must be at least 2 characters").describe("The name of the primary price.")
});

// Generate TypeScript type from the schema
export type BundleType = z.infer<typeof bundleSchema>;

// Additional no validation metadata relating to how we display data in forms
export const bundleMetadata = {
  description: { richText: true },
  date: { dateField: true },
  category: { checkboxesField: true }
}