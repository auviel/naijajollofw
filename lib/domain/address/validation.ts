import { z } from "zod";

export const geocodeRequestSchema = z.object({
  query: z.string().trim().min(5, "Enter a full delivery address"),
});

export const geocodeSuggestRequestSchema = z.object({
  query: z.string().trim().min(3, "Keep typing to see address suggestions"),
});

export type GeocodeRequest = z.infer<typeof geocodeRequestSchema>;
export type GeocodeSuggestRequest = z.infer<typeof geocodeSuggestRequestSchema>;
