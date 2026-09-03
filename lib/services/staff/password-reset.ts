import { timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import {
  generateStaffOtpCode,
  hashStaffOtpCode,
  staffOtpChallengeRepository,
} from "@/lib/db/repositories/staff-otp-challenge.repository";
import { userRepository } from "@/lib/db/repositories/user.repository";
import {
  staffForgotPasswordSchema,
  staffResetPasswordSchema,
} from "@/lib/domain/account/validation-staff";
import { sendEmailInBackground } from "@/lib/integrations/email/send";
import { buildStaffOtpEmail } from "@/lib/integrations/email/templates";
import { assertPasswordNotPwned } from "@/lib/integrations/hibp/pwned-passwords";
import { AppError } from "@/lib/utils/errors";
import { logger } from "@/lib/utils/logger";

const OTP_TTL_MS = 10 * 60 * 1000;

function passwordsMatch(password: string, confirmPassword: string): boolean {
  const a = Buffer.from(password, "utf8");
  const b = Buffer.from(confirmPassword, "utf8");
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(a, b);
}

function codesMatch(provided: string, expectedHash: string): boolean {
  const providedHash = hashStaffOtpCode(provided);
  const a = Buffer.from(providedHash, "utf8");
  const b = Buffer.from(expectedHash, "utf8");
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(a, b);
}

function isStaffRole(role: string): boolean {
  return role === "STORE_MANAGER";
}

/** Always succeeds from the caller's perspective (no email enumeration). */
export async function requestStaffPasswordReset(
  input: unknown,
): Promise<{ ok: true; message: string }> {
  const parsed = staffForgotPasswordSchema.parse(input);
  const email = parsed.email.toLowerCase();
  const user = await userRepository.findByEmail(email);

  if (!user || !isStaffRole(user.role) || !user.passwordHash) {
    logger.info("staff_password_reset.skipped_unknown_or_non_staff");
    return {
      ok: true,
      message:
        "If that email has a kitchen account, we sent a 6-digit code.",
    };
  }

  const code = generateStaffOtpCode();
  const codeHash = hashStaffOtpCode(code);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await staffOtpChallengeRepository.invalidateOpen(user.id, "password_reset");
  await staffOtpChallengeRepository.create({
    userId: user.id,
    purpose: "password_reset",
    codeHash,
    expiresAt,
  });

  const mail = buildStaffOtpEmail({
    name: user.name,
    code,
    purpose: "password_reset",
  });
  sendEmailInBackground({
    to: user.email,
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
    idempotencyKey: `staff-password-reset/${user.id}/${codeHash.slice(0, 16)}`,
  });

  return {
    ok: true,
    message:
      "If that email has a kitchen account, we sent a 6-digit code.",
  };
}

export async function resetStaffPasswordWithOtp(input: unknown): Promise<void> {
  const parsed = staffResetPasswordSchema.parse(input);

  if (!passwordsMatch(parsed.newPassword, parsed.confirmPassword)) {
    throw new AppError("VALIDATION_ERROR", "Passwords do not match.", 400);
  }
  await assertPasswordNotPwned(parsed.newPassword);

  const user = await userRepository.findByEmail(parsed.email.toLowerCase());
  if (!user || !isStaffRole(user.role)) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Invalid or expired code. Request a new one.",
      400,
    );
  }

  const challenge = await staffOtpChallengeRepository.findLatestValid(
    user.id,
    "password_reset",
  );
  if (!challenge || !codesMatch(parsed.code, challenge.codeHash)) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Invalid or expired code. Request a new one.",
      400,
    );
  }

  const passwordHash = await bcrypt.hash(parsed.newPassword, 12);
  await userRepository.updatePasswordHash(user.id, passwordHash);
  await staffOtpChallengeRepository.markUsed(challenge.id);
  await staffOtpChallengeRepository.invalidateOpen(user.id, "password_reset");
}
