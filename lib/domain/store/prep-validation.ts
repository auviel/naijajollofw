import { z } from "zod";

export const updatePrepMinutesSchema = z.object({
  prepMinutes: z.number().int().min(5).max(180),
});

export type UpdatePrepMinutesInput = z.infer<typeof updatePrepMinutesSchema>;
