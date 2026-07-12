import { timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import {
  generatePasswordResetToken,
  hashPasswordResetToken,
  passwordResetTokenRepository,
} from "@/lib/db/repositories/password-reset-token.repository";
import { userRepository } from "@/lib/db/repositories/user.repository";
import {
  dinerForgotPasswordSchema,
  dinerResetPasswordSchema,
} from "@/lib/domain/diner/validation";
import { getAppBaseUrl } from "@/lib/integrations/email/resend-client";
import { sendEmailInBackground } from "@/lib/integrations/email/send";
import { buildPasswordResetEmail } from "@/lib/integrations/email/templates";
import { AppError } from "@/lib/utils/errors";
import { logger } from "@/lib/utils/logger";

function passwordsMatch(password: string, confirmPassword: string): boolean {
  const a = Buffer.from(password, "utf8");
  const b = Buffer.from(confirmPassword, "utf8");
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(a, b);
}

const RESET_TTL_MS = 60 * 60 * 1000;

/** Always succeeds from the caller's perspective (no email enumeration). */
export async function requestDinerPasswordReset(input: unknown): Promise<void> {
  const parsed = dinerForgotPasswordSchema.parse(input);
  const email = parsed.email.toLowerCase();
  const user = await userRepository.findByEmail(email);

  if (!user || user.role !== "DINER") {
    logger.info("password_reset.skipped_unknown_or_non_diner", { email });
    return;
  }

  const rawToken = generatePasswordResetToken();
  const tokenHash = hashPasswordResetToken(rawToken);
  const expiresAt = new Date(Date.now() + RESET_TTL_MS);

  await passwordResetTokenRepository.invalidateOpenTokens(user.id);
  await passwordResetTokenRepository.create({
    userId: user.id,
    tokenHash,
    expiresAt,
  });

  const resetUrl = `${getAppBaseUrl()}/reset-password?token=${rawToken}`;
  const mail = buildPasswordResetEmail({
    name: user.name,
    resetUrl,
  });
  sendEmailInBackground({
    to: user.email,
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
    idempotencyKey: `password-reset/${user.id}/${tokenHash.slice(0, 16)}`,
  });
}

export async function resetDinerPassword(input: unknown): Promise<void> {
  const parsed = dinerResetPasswordSchema.parse(input);
  if (!passwordsMatch(parsed.password, parsed.confirmPassword)) {
    throw new AppError("VALIDATION_ERROR", "Passwords do not match.", 400);
  }

  const tokenHash = hashPasswordResetToken(parsed.token);
  const record =
    await passwordResetTokenRepository.findValidByTokenHash(tokenHash);

  if (!record || record.user.role !== "DINER") {
    throw new AppError(
      "VALIDATION_ERROR",
      "This reset link is invalid or has expired. Request a new one.",
      400,
    );
  }

  const passwordHash = await bcrypt.hash(parsed.password, 12);
  await userRepository.updatePasswordHash(record.userId, passwordHash);
  await passwordResetTokenRepository.markUsed(record.id);
  await passwordResetTokenRepository.invalidateOpenTokens(record.userId);
}
