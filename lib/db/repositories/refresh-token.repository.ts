import type { MobileApp } from "@prisma/client";
import { prisma } from "@/lib/db/client";

export const refreshTokenRepository = {
  async create(input: {
    userId: string;
    tokenHash: string;
    app: MobileApp;
    sessionVersion: number;
    expiresAt: Date;
  }) {
    return prisma.refreshToken.create({ data: input });
  },

  async findActiveByHash(tokenHash: string) {
    return prisma.refreshToken.findFirst({
      where: {
        tokenHash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: { include: { store: true } } },
    });
  },

  async revokeByHash(tokenHash: string) {
    return prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },

  async revokeAllForUser(userId: string) {
    return prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },
};
