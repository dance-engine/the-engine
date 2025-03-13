'use client'
import { z } from "zod";

// Define the event schema
export const bundleSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").describe("The name of the event."),
  description: z.string().min(10, "Description must be at least 10 characters").describe("A brief description of the event."), //TODO This should deal with the fact it's a JSON  
  category: z.enum(["congress", "workshop", "party", "class"]).array().min(1,"Must have at least one category").describe("Category"),
});

// Generate TypeScript type from the schema
export type EventType = z.infer<typeof bundleSchema>;

// Additional no validation metadata relating to how we display data in forms
export const eventMetadata = {
  description: { richText: true },
  date: { dateField: true },
  category: { checkboxesField: true }
}