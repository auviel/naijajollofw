import {
  emailVerificationTokenRepository,
  generateEmailVerificationToken,
  hashEmailVerificationToken,
} from "@/lib/db/repositories/email-verification-token.repository";
import { userRepository } from "@/lib/db/repositories/user.repository";
import { getAppBaseUrl } from "@/lib/integrations/email/resend-client";
import { sendEmailInBackground } from "@/lib/integrations/email/send";
import { buildEmailVerificationEmail } from "@/lib/integrations/email/templates";
import { AppError } from "@/lib/utils/errors";
import { logger } from "@/lib/utils/logger";

const VERIFY_TTL_MS = 48 * 60 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60_000;

async function issueVerificationEmail(user: {
  id: string;
  email: string;
  name: string;
}): Promise<void> {
  const rawToken = generateEmailVerificationToken();
  const tokenHash = hashEmailVerificationToken(rawToken);
  const expiresAt = new Date(Date.now() + VERIFY_TTL_MS);

  await emailVerificationTokenRepository.invalidateOpenTokens(user.id);
  await emailVerificationTokenRepository.create({
    userId: user.id,
    tokenHash,
    expiresAt,
  });

  const verifyUrl = `${getAppBaseUrl()}/verify-email?token=${rawToken}`;
  const mail = buildEmailVerificationEmail({
    name: user.name,
    verifyUrl,
  });
  sendEmailInBackground({
    to: user.email,
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
    idempotencyKey: `email-verify/${user.id}/${tokenHash.slice(0, 16)}`,
  });
}

/** Called after diner signup — always send a verification email. */
export async function sendDinerEmailVerification(user: {
  id: string;
  email: string;
  name: string;
}): Promise<void> {
  await issueVerificationEmail(user);
}

export async function resendDinerEmailVerification(userId: string): Promise<{
  ok: true;
  alreadyVerified: boolean;
}> {
  const user = await userRepository.findById(userId);
  if (!user || user.role !== "DINER") {
    throw new AppError("FORBIDDEN", "Diner account required", 403);
  }

  if (user.emailVerifiedAt) {
    return { ok: true, alreadyVerified: true };
  }

  const latest = await emailVerificationTokenRepository.findLatestForUser(
    user.id,
  );
  if (
    latest &&
    Date.now() - latest.createdAt.getTime() < RESEND_COOLDOWN_MS
  ) {
    logger.info("email_verify.resend_throttled", { userId: user.id });
    return { ok: true, alreadyVerified: false };
  }

  await issueVerificationEmail({
    id: user.id,
    email: user.email,
    name: user.name,
  });
  return { ok: true, alreadyVerified: false };
}

export async function verifyDinerEmailToken(token: string): Promise<{
  email: string;
}> {
  const trimmed = token.trim();
  if (trimmed.length < 20) {
    throw new AppError(
      "VALIDATION_ERROR",
      "This verification link is invalid or has expired.",
      400,
    );
  }

  const tokenHash = hashEmailVerificationToken(trimmed);
  const record =
    await emailVerificationTokenRepository.findValidByTokenHash(tokenHash);

  if (!record || record.user.role !== "DINER") {
    throw new AppError(
      "VALIDATION_ERROR",
      "This verification link is invalid or has expired. Request a new one from your account.",
      400,
    );
  }

  if (record.user.emailVerifiedAt) {
    await emailVerificationTokenRepository.markUsed(record.id);
    return { email: record.user.email };
  }

  await userRepository.markEmailVerified(record.userId);
  await emailVerificationTokenRepository.markUsed(record.id);
  await emailVerificationTokenRepository.invalidateOpenTokens(record.userId);

  return { email: record.user.email };
}
