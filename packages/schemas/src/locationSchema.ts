import { z } from "zod";

// Define location schema
export const locationSchema = z.object({
  ksuid: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  address: z.string().min(5, "Address must be at least 5 characters").optional().describe("Enter the full event address."),
  lat: z.number().min(-90, "Latitude must be between -90 and 90").max(90, "Latitude must be between -90 and 90"),
  lng: z.number().min(-180, "Longitude must be between -180 and 180").max(180, "Longitude must be between -180 and 180"),
  meta: z.record(z.union([z.string(), z.number(), z.boolean()]).optional()).optional(),
  version: z.number().optional()
});


// Example location type inferred from the schema
export type LocationType = z.infer<typeof locationSchema>;
