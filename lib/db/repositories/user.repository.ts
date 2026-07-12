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
    customerId?: string | null;
  }) {
    return prisma.user.create({
      data: {
        storeId: input.storeId,
        email: input.email.toLowerCase(),
        name: input.name,
        passwordHash: input.passwordHash,
        phoneE164: input.phoneE164,
        role: "DINER",
        customerId: input.customerId ?? null,
      },
      include: { store: true },
    });
  },

  async findByCustomerId(customerId: string) {
    return prisma.user.findUnique({
      where: { customerId },
    });
  },

  async linkCustomer(userId: string, customerId: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { customerId },
    });
  },

  async updatePasswordHash(userId: string, passwordHash: string) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        sessionVersion: { increment: 1 },
      },
    });
  },

  async updateSquareCustomerId(userId: string, squareCustomerId: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { squareCustomerId },
    });
  },

  async updateEmail(userId: string, email: string) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        email: email.toLowerCase(),
        emailVerifiedAt: null,
        sessionVersion: { increment: 1 },
      },
    });
  },

  async updateProfile(
    userId: string,
    data: { name?: string; phoneE164?: string | null },
  ) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.phoneE164 !== undefined ? { phoneE164: data.phoneE164 } : {}),
      },
    });
  },

  async markEmailVerified(userId: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { emailVerifiedAt: new Date() },
    });
  },

  async getSessionVersion(userId: string): Promise<number | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { sessionVersion: true },
    });
    return user?.sessionVersion ?? null;
  },
};

export function mapPrismaRole(role: UserRole): UserRole {
  return role;
}
