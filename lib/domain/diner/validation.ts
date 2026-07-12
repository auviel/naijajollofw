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
