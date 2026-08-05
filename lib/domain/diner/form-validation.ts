import {
  dinerChangeEmailSchema,
  dinerChangePasswordSchema,
  dinerForgotPasswordSchema,
  dinerRegisterSchema,
  dinerResetPasswordSchema,
} from "@/lib/domain/diner/validation";
import { zodErrorToFieldErrors } from "@/lib/forms/zod-field-errors";

export type DinerSigninField = "email" | "password";
export type DinerRegisterField = "name" | "email" | "phone" | "password";
export type DinerForgotField = "email";
export type DinerResetField = "password" | "confirmPassword";
export type DinerChangePasswordField =
  | "currentPassword"
  | "newPassword"
  | "confirmPassword";
export type DinerChangeEmailField = "email" | "password";

export function validateDinerSigninFields(input: {
  email: string;
  password: string;
}): Partial<Record<DinerSigninField, string>> {
  const errors: Partial<Record<DinerSigninField, string>> = {};
  if (!input.email.trim()) {
    errors.email = "Enter your email address.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) {
    errors.email = "Enter a valid email address.";
  }
  if (!input.password) {
    errors.password = "Enter your password.";
  }
  return errors;
}

export function validateDinerRegisterForm(input: {
  name: string;
  email: string;
  phone: string;
  password: string;
}): Partial<Record<DinerRegisterField, string>> {
  const parsed = dinerRegisterSchema.safeParse(input);
  return parsed.success
    ? {}
    : (zodErrorToFieldErrors(parsed.error) as Partial<
        Record<DinerRegisterField, string>
      >);
}

export function validateDinerForgotPasswordForm(input: {
  email: string;
}): Partial<Record<DinerForgotField, string>> {
  const parsed = dinerForgotPasswordSchema.safeParse(input);
  return parsed.success
    ? {}
    : (zodErrorToFieldErrors(parsed.error) as Partial<
        Record<DinerForgotField, string>
      >);
}

export function validateDinerResetPasswordForm(input: {
  token: string;
  password: string;
  confirmPassword: string;
}): Partial<Record<DinerResetField, string>> {
  const parsed = dinerResetPasswordSchema.safeParse(input);
  const errors = parsed.success
    ? ({} as Partial<Record<DinerResetField, string>>)
    : (zodErrorToFieldErrors(parsed.error) as Partial<
        Record<DinerResetField, string>
      >);
  if (
    input.password &&
    input.confirmPassword &&
    input.password !== input.confirmPassword
  ) {
    errors.confirmPassword = "Passwords do not match.";
  }
  return errors;
}

export function validateDinerChangePasswordForm(input: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Partial<Record<DinerChangePasswordField, string>> {
  const parsed = dinerChangePasswordSchema.safeParse(input);
  const errors = parsed.success
    ? ({} as Partial<Record<DinerChangePasswordField, string>>)
    : (zodErrorToFieldErrors(parsed.error) as Partial<
        Record<DinerChangePasswordField, string>
      >);
  if (
    input.newPassword &&
    input.confirmPassword &&
    input.newPassword !== input.confirmPassword
  ) {
    errors.confirmPassword = "Passwords do not match.";
  }
  return errors;
}

export function validateDinerChangeEmailForm(input: {
  email: string;
  password: string;
}): Partial<Record<DinerChangeEmailField, string>> {
  const parsed = dinerChangeEmailSchema.safeParse(input);
  return parsed.success
    ? {}
    : (zodErrorToFieldErrors(parsed.error) as Partial<
        Record<DinerChangeEmailField, string>
      >);
}
