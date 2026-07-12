import { z } from "zod";

export const dinerRegisterSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(80),
  email: z.string().trim().email("Enter a valid email").max(120),
  phone: z.string().trim().min(10, "Enter a valid phone number").max(20),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password is too long"),
  turnstileToken: z.string().trim().max(2048).optional(),
});

export type DinerRegisterInput = z.infer<typeof dinerRegisterSchema>;

export const dinerForgotPasswordSchema = z.object({
  email: z.string().trim().email("Enter a valid email").max(120),
});

export const dinerResetPasswordSchema = z.object({
  token: z.string().trim().min(20, "Invalid or expired reset link").max(200),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password is too long"),
  confirmPassword: z.string().min(1, "Confirm your password").max(72),
});

export const dinerChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password").max(72),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password is too long"),
  confirmPassword: z.string().min(1, "Confirm your password").max(72),
});

export const dinerChangeEmailSchema = z.object({
  email: z.string().trim().email("Enter a valid email").max(120),
  password: z.string().min(1, "Enter your password").max(72),
});

export const userAddressSchema = z.object({
  line1: z.string().trim().min(3).max(200),
  line2: z.string().trim().max(200).optional().nullable(),
  city: z.string().trim().min(2).max(100),
  province: z.string().trim().min(2).max(50),
  postalCode: z.string().trim().min(3).max(20),
  country: z.string().trim().length(2).default("CA"),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  formatted: z.string().trim().min(5).max(400),
  label: z.string().trim().max(40).optional().nullable(),
  isDefault: z.boolean().optional(),
});

export const createCardSchema = z.object({
  sourceId: z.string().min(1, "Payment token is required"),
  idempotencyKey: z.string().uuid(),
  cardholderName: z.string().trim().max(100).optional(),
});
