import { unstable_cache } from "next/cache";
import { cache } from "react";
import { requireStoreManager } from "@/lib/auth/session";
import { revalidateStorefrontCache, STOREFRONT_CACHE_TAG } from "@/lib/cache/storefront";
import { getStoreTimeZone } from "@/lib/config/environment";
import { storeHoursRepository } from "@/lib/db/repositories/store-hours.repository";
import {
  defaultWeeklySchedule,
  evaluateStoreOpenStatus,
  mapRowsToScheduleDays,
  timeStringToMinutes,
  type StoreHoursSchedule,
  type StoreOpenStatus,
} from "@/lib/domain/store/hours";
import { updateStoreHoursSchema } from "@/lib/domain/store/hours-validation";
import { resolvePublicStoreId } from "@/lib/services/storefront/resolve-public-store";

type CachedHoursRow = {
  dayOfWeek: number;
  closed: boolean;
  openMinute: number | null;
  closeMinute: number | null;
};

const loadPublicHoursRows = unstable_cache(
  async (storeId: string): Promise<CachedHoursRow[]> => {
    const rows = await storeHoursRepository.findByStoreId(storeId);
    return rows.map((row) => ({
      dayOfWeek: row.dayOfWeek,
      closed: row.closed,
      openMinute: row.openMinute,
      closeMinute: row.closeMinute,
    }));
  },
  ["public-store-hours"],
  { revalidate: 60, tags: [STOREFRONT_CACHE_TAG] },
);

export async function getStaffStoreHours(): Promise<StoreHoursSchedule> {
  const user = await requireStoreManager();
  const rows = await storeHoursRepository.findByStoreId(user.storeId);
  const timezone = getStoreTimeZone();

  if (rows.length === 0) {
    return {
      timezone,
      configured: false,
      days: defaultWeeklySchedule(),
    };
  }

  return {
    timezone,
    configured: true,
    days: mapRowsToScheduleDays(rows),
  };
}

export async function updateStaffStoreHours(
  input: unknown,
): Promise<StoreHoursSchedule> {
  const user = await requireStoreManager();
  const parsed = updateStoreHoursSchema.parse(input);
  const timezone = getStoreTimeZone();

  const rows = await storeHoursRepository.replaceWeek(
    user.storeId,
    parsed.days.map((day) => {
      if (day.closed) {
        return {
          dayOfWeek: day.dayOfWeek,
          closed: true,
          openMinute: null,
          closeMinute: null,
        };
      }
      const openMinute = timeStringToMinutes(day.openTime ?? "");
      const closeMinute = timeStringToMinutes(day.closeTime ?? "");
      return {
        dayOfWeek: day.dayOfWeek,
        closed: false,
        openMinute,
        closeMinute,
      };
    }),
  );

  revalidateStorefrontCache();

  return {
    timezone,
    configured: true,
    days: mapRowsToScheduleDays(rows),
  };
}

export const getPublicStoreHoursSchedule = cache(
  async function getPublicStoreHoursSchedule(
    storeId?: string,
  ): Promise<StoreHoursSchedule> {
    const id = storeId ?? (await resolvePublicStoreId());
    const rows = await loadPublicHoursRows(id);
    const timezone = getStoreTimeZone();

    if (rows.length === 0) {
      return {
        timezone,
        configured: false,
        days: defaultWeeklySchedule(),
      };
    }

    return {
      timezone,
      configured: true,
      days: mapRowsToScheduleDays(rows),
    };
  },
);

export const getPublicStoreOpenStatus = cache(
  async function getPublicStoreOpenStatus(
    storeId?: string,
  ): Promise<StoreOpenStatus> {
    const id = storeId ?? (await resolvePublicStoreId());
    const rows = await loadPublicHoursRows(id);
    return evaluateStoreOpenStatus(rows, getStoreTimeZone());
  },
);
