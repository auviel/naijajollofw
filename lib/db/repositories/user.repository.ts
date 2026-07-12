import type { UserRole } from "@/lib/domain/auth/types";
import { prisma } from "@/lib/db/client";

export const userRepository = {
  async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { store: true },
    });
  },

  async findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      include: { store: true },
    });
  },

  async createDiner(input: {
    storeId: string;
    email: string;
    name: string;
    passwordHash: string;
    phoneE164: string;
  }) {
    return prisma.user.create({
      data: {
        storeId: input.storeId,
        email: input.email.toLowerCase(),
        name: input.name,
        passwordHash: input.passwordHash,
        phoneE164: input.phoneE164,
        role: "DINER",
      },
      include: { store: true },
    });
  },

  async updatePasswordHash(userId: string, passwordHash: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  },
};

export function mapPrismaRole(role: UserRole): UserRole {
  return role;
}
