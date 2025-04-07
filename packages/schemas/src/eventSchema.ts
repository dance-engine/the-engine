'use client'
import { z } from "zod";
import { locationSchema } from "./locationSchema.js";

// Define the event schema
export const eventSchema = z.object({
  ksuid: z.string().describe("ID of the event"),
  name: z.string().min(2, "Name must be at least 2 characters").describe("The name of the event."),
  banner: z.string().optional().describe('Appears at the top of your page'),
  starts_at: z.string().refine((val) => { return val !== undefined || !isNaN(Date.parse(val))}, {
    message: "Invalid date or time",
  }).describe("Select the event start."),
  ends_at: z.string().refine((val) => { return val !== undefined || !isNaN(Date.parse(val))}, {
    message: "Invalid date or time",
  }).describe("Select the event end."),
  description: z.string().min(10, "Description must be at least 10 characters").describe("A brief description of the event."), //TODO This should deal with the fact it's a JSON  
  category: z.enum(["congress", "workshop", "party", "class", "lecture"]).array().min(1,"Must have at least one category").describe("Category"),
  // venue: z.enum(["Indoor", "Outdoor", "Virtual"]).describe("Select the type of venue."),
  location: locationSchema.describe("The event location"),
  capacity: z.coerce.number().min(1,"Capacity must be at least 1 if set").describe("Maximum number of attendees."),
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
export type EventType = z.infer<typeof eventSchema>;

// Additional no validation metadata relating to how we display data in forms
export const eventMetadata = {
  ksuid: { hidden: true },
  banner: { fileUploadField: 'single' },
  description: { richText: true },
  // description: { multiLine: true },
  starts_at: { dateField: true },
  ends_at: { dateField: true },
  category: { checkboxesField: true },
  location: {
    lat: { hidden: true},
    lng: { hidden: true }
  },
  created_at: { info: true },
  updated_at: { info: true },
  version: { info: true }
}