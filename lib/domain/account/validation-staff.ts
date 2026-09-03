import { z } from "zod";
import { normalizeCanadianPhone } from "@/lib/utils/phone";

const optionalPhone = z
  .string()
  .trim()
  .optional()
  .transform((value, ctx) => {
    if (value === undefined) {
      return undefined;
    }
    if (value === "") {
      return null;
    }
    const phone = normalizeCanadianPhone(value);
    if (!phone) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter a valid Canadian phone number",
      });
      return z.NEVER;
    }
    return phone;
  });

export const updateStaffProfileSchema = z.object({
  name: z.string().trim().min(1, "Name is required").optional(),
  phone: optionalPhone,
  email: z
    .string()
    .trim()
    .email("Enter a valid email address")
    .transform((v) => v.toLowerCase())
    .optional(),
});

export const staffPasswordOtpSchema = z.object({});

export const staffPasswordConfirmSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter the 6-digit code"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(8, "Confirm your password"),
});

export const staffForgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Enter a valid email address")
    .transform((v) => v.toLowerCase()),
});

export const staffResetPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Enter a valid email address")
    .transform((v) => v.toLowerCase()),
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter the 6-digit code"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(8, "Confirm your password"),
});

export const staffEmailConfirmSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter the 6-digit code"),
});

export type UpdateStaffProfileInput = z.infer<typeof updateStaffProfileSchema>;
