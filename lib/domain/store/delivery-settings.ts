import type { DeliveryProviderId } from "@/lib/domain/delivery/types";
import type { StoreProfile } from "@/lib/domain/store/types";
import { getDoorDashExternalStoreIdFromEnv } from "@/lib/integrations/delivery/doordash/config";

/** DoorDash pickup store id — from env, then deliverGO Store.id. */
export function getDoorDashExternalStoreId(store: StoreProfile): string {
  return getDoorDashExternalStoreIdFromEnv() ?? store.id;
}

export function getStoreEnabledProviderIds(store: StoreProfile): DeliveryProviderId[] {
  const providerIds: DeliveryProviderId[] = [];

  if (store.enabledUberDirect) {
    providerIds.push("uber_direct");
  }

  if (store.enabledDoorDashDrive) {
    providerIds.push("doordash_drive");
  }

  return providerIds;
}
