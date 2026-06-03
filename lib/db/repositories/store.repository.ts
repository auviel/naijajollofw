import type { StoreProfile } from "@/lib/domain/store/types";
import type { Store } from "@prisma/client";
import { prisma } from "@/lib/db/client";

export function mapStoreToProfile(store: Store): StoreProfile {
  return {
    id: store.id,
    name: store.name,
    phone: store.phone,
    addressLine1: store.addressLine1,
    addressLine2: store.addressLine2 ?? undefined,
    city: store.city,
    province: store.province,
    postalCode: store.postalCode,
    country: store.country,
    latitude: store.latitude,
    longitude: store.longitude,
  };
}

export function formatStoreAddress(store: Store): string {
  const line2 = store.addressLine2 ? `, ${store.addressLine2}` : "";
  return `${store.addressLine1}${line2}, ${store.city}, ${store.province} ${store.postalCode}, ${store.country}`;
}

export type UpdateStoreData = {
  name: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  latitude: number;
  longitude: number;
};

export const storeRepository = {
  async findById(id: string): Promise<Store | null> {
    return prisma.store.findUnique({ where: { id } });
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
    return prisma.store.update({
      where: { id },
      data: {
        name: data.name,
        phone: data.phone,
        addressLine1: data.addressLine1,
        addressLine2: data.addressLine2 ?? null,
        city: data.city,
        province: data.province,
        postalCode: data.postalCode,
        country: data.country,
        latitude: data.latitude,
        longitude: data.longitude,
      },
    });
  },
};
