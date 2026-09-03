import { timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import { requireStoreManager } from "@/lib/auth/session";
import {
  generateStaffOtpCode,
  hashStaffOtpCode,
  staffOtpChallengeRepository,
} from "@/lib/db/repositories/staff-otp-challenge.repository";
import { userRepository } from "@/lib/db/repositories/user.repository";
import {
  staffEmailConfirmSchema,
  staffPasswordConfirmSchema,
  updateStaffProfileSchema,
} from "@/lib/domain/account/validation-staff";
import { sendEmailInBackground } from "@/lib/integrations/email/send";
import { buildStaffOtpEmail } from "@/lib/integrations/email/templates";
import { assertPasswordNotPwned } from "@/lib/integrations/hibp/pwned-passwords";
import { AppError } from "@/lib/utils/errors";

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

export type UpdateStaffProfileResult = {
  user: {
    id: string;
    name: string;
    email: string;
    phoneE164: string | null;
    role: string;
    storeId: string;
    storeName: string;
  };
  emailChangePending: boolean;
};

export async function updateStaffProfile(
  input: unknown,
): Promise<UpdateStaffProfileResult> {
  const session = await requireStoreManager();
  const parsed = updateStaffProfileSchema.parse(input);

  if (
    parsed.name === undefined &&
    parsed.phone === undefined &&
    parsed.email === undefined
  ) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Provide at least one field to update.",
      400,
    );
  }

  const dbUser = await userRepository.findById(session.id);
  if (!dbUser || dbUser.role !== "STORE_MANAGER") {
    throw new AppError("FORBIDDEN", "Staff account required", 403);
  }

  if (parsed.name !== undefined || parsed.phone !== undefined) {
    await userRepository.updateProfile(session.id, {
      ...(parsed.name !== undefined ? { name: parsed.name } : {}),
      ...(parsed.phone !== undefined ? { phoneE164: parsed.phone } : {}),
    });
  }

  let emailChangePending = false;

  if (parsed.email !== undefined && parsed.email !== dbUser.email.toLowerCase()) {
    const existing = await userRepository.findByEmail(parsed.email);
    if (existing && existing.id !== session.id) {
      throw new AppError(
        "VALIDATION_ERROR",
        "That email is already in use.",
        400,
      );
    }

    const code = generateStaffOtpCode();
    const codeHash = hashStaffOtpCode(code);
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);

    await staffOtpChallengeRepository.invalidateOpen(session.id, "email_change");
    await staffOtpChallengeRepository.create({
      userId: session.id,
      purpose: "email_change",
      codeHash,
      pendingEmail: parsed.email,
      expiresAt,
    });

    const mail = buildStaffOtpEmail({
      name: parsed.name ?? dbUser.name,
      code,
      purpose: "email_change",
    });
    sendEmailInBackground({
      to: parsed.email,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      idempotencyKey: `staff-email-otp/${session.id}/${codeHash.slice(0, 16)}`,
    });

    emailChangePending = true;
  }

  const refreshed = await userRepository.findById(session.id);
  if (!refreshed) {
    throw new AppError("NOT_FOUND", "User not found", 404);
  }

  return {
    user: {
      id: refreshed.id,
      name: refreshed.name,
      email: refreshed.email,
      phoneE164: refreshed.phoneE164 ?? null,
      role: refreshed.role,
      storeId: refreshed.storeId,
      storeName: refreshed.store?.name ?? session.storeName,
    },
    emailChangePending,
  };
}

export async function confirmStaffEmailChange(input: unknown): Promise<{
  user: UpdateStaffProfileResult["user"];
}> {
  const session = await requireStoreManager();
  const parsed = staffEmailConfirmSchema.parse(input);

  const challenge = await staffOtpChallengeRepository.findLatestValid(
    session.id,
    "email_change",
  );
  if (!challenge?.pendingEmail || !codesMatch(parsed.code, challenge.codeHash)) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Invalid or expired code. Request a new one.",
      400,
    );
  }

  const existing = await userRepository.findByEmail(challenge.pendingEmail);
  if (existing && existing.id !== session.id) {
    throw new AppError(
      "VALIDATION_ERROR",
      "That email is already in use.",
      400,
    );
  }

  await userRepository.updateEmail(session.id, challenge.pendingEmail);
  await staffOtpChallengeRepository.markUsed(challenge.id);
  await staffOtpChallengeRepository.invalidateOpen(session.id, "email_change");

  const refreshed = await userRepository.findById(session.id);
  if (!refreshed) {
    throw new AppError("NOT_FOUND", "User not found", 404);
  }

  return {
    user: {
      id: refreshed.id,
      name: refreshed.name,
      email: refreshed.email,
      phoneE164: refreshed.phoneE164 ?? null,
      role: refreshed.role,
      storeId: refreshed.storeId,
      storeName: refreshed.store?.name ?? session.storeName,
    },
  };
}

export async function requestStaffPasswordOtp(): Promise<{ sent: true }> {
  const session = await requireStoreManager();
  const dbUser = await userRepository.findById(session.id);
  if (!dbUser || dbUser.role !== "STORE_MANAGER") {
    throw new AppError("FORBIDDEN", "Staff account required", 403);
  }

  const code = generateStaffOtpCode();
  const codeHash = hashStaffOtpCode(code);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await staffOtpChallengeRepository.invalidateOpen(
    session.id,
    "password_change",
  );
  await staffOtpChallengeRepository.create({
    userId: session.id,
    purpose: "password_change",
    codeHash,
    expiresAt,
  });

  const mail = buildStaffOtpEmail({
    name: dbUser.name,
    code,
    purpose: "password_change",
  });
  sendEmailInBackground({
    to: dbUser.email,
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
    idempotencyKey: `staff-password-otp/${session.id}/${codeHash.slice(0, 16)}`,
  });

  return { sent: true };
}

export async function confirmStaffPasswordChange(
  input: unknown,
): Promise<void> {
  const session = await requireStoreManager();
  const parsed = staffPasswordConfirmSchema.parse(input);

  if (!passwordsMatch(parsed.newPassword, parsed.confirmPassword)) {
    throw new AppError("VALIDATION_ERROR", "Passwords do not match.", 400);
  }

  await assertPasswordNotPwned(parsed.newPassword);

  const challenge = await staffOtpChallengeRepository.findLatestValid(
    session.id,
    "password_change",
  );
  if (!challenge || !codesMatch(parsed.code, challenge.codeHash)) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Invalid or expired code. Request a new one.",
      400,
    );
  }

  const passwordHash = await bcrypt.hash(parsed.newPassword, 12);
  await userRepository.updatePasswordHash(session.id, passwordHash);
  await staffOtpChallengeRepository.markUsed(challenge.id);
  await staffOtpChallengeRepository.invalidateOpen(
    session.id,
    "password_change",
  );
}
