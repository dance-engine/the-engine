import { z } from "zod";

// Define location schema
export const locationSchema = z.object({
  name: z.string().min(1, "Name is required"),
  lat: z.number().min(-90, "Latitude must be between -90 and 90").max(90, "Latitude must be between -90 and 90"),
  lng: z.number().min(-180, "Longitude must be between -180 and 180").max(180, "Longitude must be between -180 and 180"),
});

// Example location type inferred from the schema
export type Location = z.infer<typeof locationSchema>;
