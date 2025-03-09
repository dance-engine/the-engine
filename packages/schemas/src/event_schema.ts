import { z } from "zod";

export const eventSchema = z.object({
  eventName: z.string().min(3, "Event name must be at least 3 characters").default("Event Name").describe("Event Name"),
  description: z.string().min(10, "Description must be at least 10 characters").default("Your event description").describe("Event Description"),
  category: z.enum(["congress", "workshop", "party", "class",""]).default("").describe("Category"),

  venueName: z.string().min(3, "Venue name must be at least 3 characters").describe("Venue Name"),
  address: z.string().min(5, "Address must be at least 5 characters").default("").describe("Venue Address"),
  latitude: z.number().default(51.505).describe("Latitude"),
  longitude: z.number().default(-0.09).describe("Longitude"),

  startDate: z.string().min(1, "Start date is required").default("").describe("Start Date"),
  endDate: z.string().min(1, "End date is required").default("").describe("End Date"),
  // timezone: z.string().default("UTC").describe("Timezone"),

  // rsvpRequired: z.boolean().default(false).describe("RSVP Required"),
});

export type EventSetupValues = z.infer<typeof eventSchema>;
