import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/db/client";

export function hashEmailVerificationToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateEmailVerificationToken(): string {
  return randomBytes(32).toString("hex");
}

export const emailVerificationTokenRepository = {
  async invalidateOpenTokens(userId: string) {
    await prisma.emailVerificationToken.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() },
    });
  },

  async create(input: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }) {
    return prisma.emailVerificationToken.create({
      data: {
        userId: input.userId,
        tokenHash: input.tokenHash,
        expiresAt: input.expiresAt,
      },
    });
  },

  async findLatestForUser(userId: string) {
    return prisma.emailVerificationToken.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  },

  async findValidByTokenHash(tokenHash: string) {
    return prisma.emailVerificationToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });
  },

  async markUsed(id: string) {
    return prisma.emailVerificationToken.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  },
};
