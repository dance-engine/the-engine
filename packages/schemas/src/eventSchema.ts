'use client'
import { z } from "zod";
import { locationSchema } from "./locationSchema.js";

// Define the event schema
export const eventSchema = z.object({
  ksuid: z.string().describe("ID of the event"),
  name: z.string().min(2, "Name must be at least 2 characters").describe("The name of the event."),
  banner: z.string().describe('Appears at the top of your page'),
  date: z.string().refine((val) => { return val !== undefined || !isNaN(Date.parse(val))}, {
    message: "Invalid date",
  }).describe("Select the event date."),
  description: z.string().min(10, "Description must be at least 10 characters").describe("A brief description of the event."), //TODO This should deal with the fact it's a JSON  
  category: z.enum(["congress", "workshop", "party", "class", "lecture"]).array().min(1,"Must have at least one category").describe("Category"),
  // venue: z.enum(["Indoor", "Outdoor", "Virtual"]).describe("Select the type of venue."),
  location: locationSchema.describe("The event location"),
  address: z.string().min(5, "Address must be at least 5 characters").describe("Enter the full event address."),
  capacity: z.coerce.number().min(1,"Capacity must be at least 1 if set").optional().describe("Maximum number of attendees."),
});

// Generate TypeScript type from the schema
export type EventType = z.infer<typeof eventSchema>;

// Additional no validation metadata relating to how we display data in forms
export const eventMetadata = {
  ksuid: { hidden: true },
  banner: { fileUploadField: 'single' },
  description: { richText: true },
  date: { dateField: true },
  category: { checkboxesField: true },
  location: {
    lat: { hidden: true},
    lng: { hidden: true }
  }
}