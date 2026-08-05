import { cache } from "react";
import type { StoreProfile } from "@/lib/domain/store/types";
import type { Store } from "@prisma/client";
import { prisma } from "@/lib/db/client";

/** Short process TTL — React `cache()` alone misses across parallel RSC trees. */
const STORE_READ_TTL_MS = 5_000;
const storeByIdMemo = new Map<
  string,
  { expiresAt: number; value: Store | null; inflight?: Promise<Store | null> }
>();

export function invalidateStoreReadCache(id?: string) {
  if (id) {
    storeByIdMemo.delete(id);
    return;
  }
  storeByIdMemo.clear();
}

async function loadStoreById(id: string): Promise<Store | null> {
  const now = Date.now();
  const hit = storeByIdMemo.get(id);
  if (hit && hit.expiresAt > now && !hit.inflight) {
    return hit.value;
  }
  if (hit?.inflight) {
    return hit.inflight;
  }

  const inflight = prisma.store.findUnique({ where: { id } }).then((value) => {
    storeByIdMemo.set(id, {
      expiresAt: Date.now() + STORE_READ_TTL_MS,
      value,
    });
    return value;
  });

  storeByIdMemo.set(id, {
    expiresAt: now + STORE_READ_TTL_MS,
    value: hit?.value ?? null,
    inflight,
  });

  return inflight;
}

/** Deduplicate Store.findUnique within a single RSC/request render. */
const findStoreByIdCached = cache(async (id: string): Promise<Store | null> => {
  return loadStoreById(id);
});

export function mapStoreToProfile(store: Store): StoreProfile {
  return {
    id: store.id,
    name: store.name,
    phone: store.phone,
    email: store.email,
    addressLine1: store.addressLine1,
    addressLine2: store.addressLine2 ?? undefined,
    city: store.city,
    province: store.province,
    postalCode: store.postalCode,
    country: store.country,
    latitude: store.latitude,
    longitude: store.longitude,
    enabledUberDirect: store.enabledUberDirect,
    enabledDoorDashDrive: store.enabledDoorDashDrive,
  };
}

export function formatStoreAddress(store: Store): string {
  const line2 = store.addressLine2 ? `, ${store.addressLine2}` : "";
  return `${store.addressLine1}${line2}, ${store.city}, ${store.province} ${store.postalCode}, ${store.country}`;
}

export type UpdateStoreData = {
  name: string;
  phone: string;
  email: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  latitude: number;
  longitude: number;
  enabledUberDirect?: boolean;
  enabledDoorDashDrive?: boolean;
};

export const storeRepository = {
  async findById(id: string): Promise<Store | null> {
    return findStoreByIdCached(id);
  },

  async findByIdOrThrow(id: string): Promise<Store> {
    const store = await this.findById(id);
    if (!store) {
      throw new Error(`Store not found: ${id}`);
    }
    return store;
  },

  async getProfileById(id: string): Promise<StoreProfile | null> {
    const store = await this.findById(id);
    return store ? mapStoreToProfile(store) : null;
  },

  async update(id: string, data: UpdateStoreData): Promise<Store> {
    const { enabledUberDirect, enabledDoorDashDrive, ...addressData } = data;

    const updated = await prisma.store.update({
      where: { id },
      data: {
        ...addressData,
        ...(enabledUberDirect !== undefined ? { enabledUberDirect } : {}),
        ...(enabledDoorDashDrive !== undefined ? { enabledDoorDashDrive } : {}),
      },
    });
    invalidateStoreReadCache(id);
    return updated;
  },

  async updatePrepMinutes(id: string, prepMinutes: number): Promise<Store> {
    const updated = await prisma.store.update({
      where: { id },
      data: { prepMinutes },
    });
    invalidateStoreReadCache(id);
    return updated;
  },
};
