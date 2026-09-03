import { createHash, randomInt } from "node:crypto";
import { prisma } from "@/lib/db/client";

export type StaffOtpPurpose =
  | "password_change"
  | "password_reset"
  | "email_change";

export function hashStaffOtpCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

/** Cryptographically random 6-digit code (000000–999999). */
export function generateStaffOtpCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export const staffOtpChallengeRepository = {
  async invalidateOpen(userId: string, purpose: StaffOtpPurpose) {
    await prisma.staffOtpChallenge.updateMany({
      where: { userId, purpose, usedAt: null },
      data: { usedAt: new Date() },
    });
  },

  async create(input: {
    userId: string;
    purpose: StaffOtpPurpose;
    codeHash: string;
    pendingEmail?: string | null;
    expiresAt: Date;
  }) {
    return prisma.staffOtpChallenge.create({
      data: {
        userId: input.userId,
        purpose: input.purpose,
        codeHash: input.codeHash,
        pendingEmail: input.pendingEmail ?? null,
        expiresAt: input.expiresAt,
      },
    });
  },

  async findLatestValid(userId: string, purpose: StaffOtpPurpose) {
    return prisma.staffOtpChallenge.findFirst({
      where: {
        userId,
        purpose,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  async markUsed(id: string) {
    return prisma.staffOtpChallenge.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  },
};
