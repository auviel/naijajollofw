import { prisma } from "@/lib/db/client";

export type UserAddressRecord = {
  id: string;
  userId: string;
  line1: string;
  line2: string | null;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  formatted: string;
  label: string | null;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export const userAddressRepository = {
  async listForUser(userId: string): Promise<UserAddressRecord[]> {
    return prisma.userAddress.findMany({
      where: { userId },
      orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
    });
  },

  async findByIdForUser(id: string, userId: string) {
    return prisma.userAddress.findFirst({
      where: { id, userId },
    });
  },

  async create(
    userId: string,
    data: {
      line1: string;
      line2?: string | null;
      city: string;
      province: string;
      postalCode: string;
      country?: string;
      latitude?: number | null;
      longitude?: number | null;
      formatted: string;
      label?: string | null;
      isDefault?: boolean;
    },
  ) {
    const makeDefault = Boolean(data.isDefault);
    return prisma.$transaction(async (tx) => {
      if (makeDefault) {
        await tx.userAddress.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        });
      }
      const count = await tx.userAddress.count({ where: { userId } });
      return tx.userAddress.create({
        data: {
          userId,
          line1: data.line1,
          line2: data.line2 ?? null,
          city: data.city,
          province: data.province,
          postalCode: data.postalCode,
          country: data.country ?? "CA",
          latitude: data.latitude ?? null,
          longitude: data.longitude ?? null,
          formatted: data.formatted,
          label: data.label ?? null,
          isDefault: makeDefault || count === 0,
        },
      });
    });
  },

  async update(
    id: string,
    userId: string,
    data: {
      line1?: string;
      line2?: string | null;
      city?: string;
      province?: string;
      postalCode?: string;
      country?: string;
      latitude?: number | null;
      longitude?: number | null;
      formatted?: string;
      label?: string | null;
      isDefault?: boolean;
    },
  ) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.userAddress.findFirst({
        where: { id, userId },
      });
      if (!existing) {
        return null;
      }
      if (data.isDefault) {
        await tx.userAddress.updateMany({
          where: { userId, isDefault: true, NOT: { id } },
          data: { isDefault: false },
        });
      }
      return tx.userAddress.update({
        where: { id },
        data: {
          ...(data.line1 !== undefined ? { line1: data.line1 } : {}),
          ...(data.line2 !== undefined ? { line2: data.line2 } : {}),
          ...(data.city !== undefined ? { city: data.city } : {}),
          ...(data.province !== undefined ? { province: data.province } : {}),
          ...(data.postalCode !== undefined
            ? { postalCode: data.postalCode }
            : {}),
          ...(data.country !== undefined ? { country: data.country } : {}),
          ...(data.latitude !== undefined ? { latitude: data.latitude } : {}),
          ...(data.longitude !== undefined ? { longitude: data.longitude } : {}),
          ...(data.formatted !== undefined ? { formatted: data.formatted } : {}),
          ...(data.label !== undefined ? { label: data.label } : {}),
          ...(data.isDefault !== undefined ? { isDefault: data.isDefault } : {}),
        },
      });
    });
  },

  async delete(id: string, userId: string) {
    const existing = await prisma.userAddress.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      return null;
    }
    await prisma.userAddress.delete({ where: { id } });
    if (existing.isDefault) {
      const next = await prisma.userAddress.findFirst({
        where: { userId },
        orderBy: { updatedAt: "desc" },
      });
      if (next) {
        await prisma.userAddress.update({
          where: { id: next.id },
          data: { isDefault: true },
        });
      }
    }
    return existing;
  },
};
