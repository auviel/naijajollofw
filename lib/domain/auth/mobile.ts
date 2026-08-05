import { z } from "zod";

export const mobileAppSchema = z.enum(["staff", "diner"]);

export const mobileLoginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
  app: mobileAppSchema,
  turnstileToken: z.string().trim().max(2048).optional(),
});

export const mobileRefreshSchema = z.object({
  refreshToken: z.string().trim().min(20).max(200),
});

export const mobileLogoutSchema = z.object({
  refreshToken: z.string().trim().min(20).max(200).optional(),
});

export const registerPushDeviceSchema = z.object({
  expoPushToken: z
    .string()
    .trim()
    .min(20)
    .max(200)
    .refine(
      (value) =>
        value.startsWith("ExponentPushToken[") ||
        value.startsWith("ExpoPushToken["),
      "Invalid Expo push token",
    ),
  platform: z.enum(["ios", "android", "web"]),
  app: mobileAppSchema,
});

export const unregisterPushDeviceSchema = z.object({
  expoPushToken: z.string().trim().min(20).max(200),
});
