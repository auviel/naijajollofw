import type { MobileApp } from "@prisma/client";
import { prisma } from "@/lib/db/client";

export const pushDeviceRepository = {
  async upsert(input: {
    userId: string;
    expoPushToken: string;
    platform: string;
    app: MobileApp;
  }) {
    return prisma.pushDevice.upsert({
      where: {
        userId_expoPushToken: {
          userId: input.userId,
          expoPushToken: input.expoPushToken,
        },
      },
      create: input,
      update: {
        platform: input.platform,
        app: input.app,
      },
    });
  },

  async deleteForUser(userId: string, expoPushToken: string) {
    return prisma.pushDevice.deleteMany({
      where: { userId, expoPushToken },
    });
  },

  async listTokensForStoreApp(storeId: string, app: MobileApp) {
    const devices = await prisma.pushDevice.findMany({
      where: {
        app,
        user: { storeId, role: "STORE_MANAGER" },
      },
      select: { expoPushToken: true, userId: true },
    });
    return devices;
  },

  async listTokensForUserApp(userId: string, app: MobileApp) {
    return prisma.pushDevice.findMany({
      where: { userId, app },
      select: { expoPushToken: true },
    });
  },
};
