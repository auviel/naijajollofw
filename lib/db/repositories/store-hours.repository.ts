import { prisma } from "@/lib/db/client";
import type { StoreHours } from "@prisma/client";

export const storeHoursRepository = {
  async findByStoreId(storeId: string): Promise<StoreHours[]> {
    return prisma.storeHours.findMany({
      where: { storeId },
      orderBy: { dayOfWeek: "asc" },
    });
  },

  async replaceWeek(
    storeId: string,
    days: Array<{
      dayOfWeek: number;
      closed: boolean;
      openMinute: number | null;
      closeMinute: number | null;
    }>,
  ): Promise<StoreHours[]> {
    await prisma.$transaction(async (tx) => {
      await tx.storeHours.deleteMany({ where: { storeId } });
      await tx.storeHours.createMany({
        data: days.map((day) => ({
          storeId,
          dayOfWeek: day.dayOfWeek,
          closed: day.closed,
          openMinute: day.closed ? null : day.openMinute,
          closeMinute: day.closed ? null : day.closeMinute,
        })),
      });
    });

    return this.findByStoreId(storeId);
  },
};
