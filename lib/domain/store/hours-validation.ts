import { z } from "zod";
import { timeStringToMinutes } from "@/lib/domain/store/hours";

const daySchema = z
  .object({
    dayOfWeek: z.number().int().min(0).max(6),
    closed: z.boolean(),
    openTime: z.string().nullable(),
    closeTime: z.string().nullable(),
  })
  .superRefine((day, ctx) => {
    if (day.closed) {
      return;
    }
    if (!day.openTime || timeStringToMinutes(day.openTime) == null) {
      ctx.addIssue({
        code: "custom",
        path: ["openTime"],
        message: "Open time is required (HH:MM)",
      });
    }
    if (!day.closeTime || timeStringToMinutes(day.closeTime) == null) {
      ctx.addIssue({
        code: "custom",
        path: ["closeTime"],
        message: "Close time is required (HH:MM)",
      });
    }
    const open = day.openTime ? timeStringToMinutes(day.openTime) : null;
    const close = day.closeTime ? timeStringToMinutes(day.closeTime) : null;
    if (open != null && close != null && open === close) {
      ctx.addIssue({
        code: "custom",
        path: ["closeTime"],
        message: "Close time must differ from open time",
      });
    }
  });

export const updateStoreHoursSchema = z.object({
  days: z.array(daySchema).length(7),
}).superRefine((data, ctx) => {
  const days = new Set(data.days.map((d) => d.dayOfWeek));
  if (days.size !== 7) {
    ctx.addIssue({
      code: "custom",
      path: ["days"],
      message: "Provide exactly one entry for each day of the week",
    });
  }
});

export type UpdateStoreHoursInput = z.infer<typeof updateStoreHoursSchema>;
