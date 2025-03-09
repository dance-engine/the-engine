import { z } from "zod";

// Define the event schema
export const eventSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").describe("The name of the event."),
  description: z.string().min(10, "Description must be at least 10 characters").describe("A brief description of the event."),
  venue: z.enum(["Indoor", "Outdoor", "Virtual"]).describe("Select the type of venue."),
  address: z.string().min(5, "Address must be at least 5 characters").describe("Enter the full event address."),
  capacity: z.number().min(1, "Capacity must be at least 1").describe("Maximum number of attendees."),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid date",
  }).describe("Select the event date."),
});

// Generate TypeScript type from the schema
export type EventType = z.infer<typeof eventSchema>;