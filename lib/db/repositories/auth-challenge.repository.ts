import { createHash } from "node:crypto";
import { prisma } from "@/lib/db/client";

export function hashAuthChallengeKey(parts: string[]): string {
  return createHash("sha256").update(parts.join("|")).digest("hex");
}

export const authChallengeRepository = {
  async findByKey(key: string) {
    return prisma.authChallenge.findUnique({ where: { key } });
  },

  async upsertWindow(input: {
    key: string;
    failCount: number;
    windowStartedAt: Date;
  }) {
    return prisma.authChallenge.upsert({
      where: { key: input.key },
      create: {
        key: input.key,
        failCount: input.failCount,
        windowStartedAt: input.windowStartedAt,
      },
      update: {
        failCount: input.failCount,
        windowStartedAt: input.windowStartedAt,
      },
    });
  },

  async deleteByKey(key: string) {
    await prisma.authChallenge.deleteMany({ where: { key } });
  },
};
