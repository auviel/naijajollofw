import type { DeliveryProviderId } from "@/lib/domain/delivery/types";
import type { StoreProfile } from "@/lib/domain/store/types";
import { getStoreEnabledProviderIds } from "@/lib/domain/store/delivery-settings";
import {
  getConfiguredDeliveryProviderIds,
  isDoorDashConfigured,
  isDoorDashEnabled,
  isUberConfigured,
} from "@/lib/config/environment";
import type { DeliveryProvider } from "./provider.interface";
import { doorDashDriveAdapter } from "./doordash/adapter";
import { uberDirectAdapter } from "./uber/adapter";

const providersById: Record<DeliveryProviderId, DeliveryProvider> = {
  uber_direct: uberDirectAdapter,
  doordash_drive: doorDashDriveAdapter,
};

/** Providers with credentials in the environment. */
export function getEnabledDeliveryProviders(): DeliveryProvider[] {
  return getConfiguredDeliveryProviderIds().map(
    (providerId) => providersById[providerId],
  );
}

/** Providers enabled for a store and configured in the environment. */
export function getEnabledDeliveryProvidersForStore(store: StoreProfile): DeliveryProvider[] {
  const configured = new Set(getConfiguredDeliveryProviderIds());
  const storeEnabled = getStoreEnabledProviderIds(store);

  return storeEnabled
    .filter((providerId) => configured.has(providerId))
    .map((providerId) => providersById[providerId]);
}

/** Resolve the default delivery provider for a store. */
export function getDeliveryProviderForStore(store: StoreProfile): DeliveryProvider {
  const enabled = getEnabledDeliveryProvidersForStore(store);
  if (enabled.length === 0) {
    throw new Error(
      "No delivery providers are enabled for this store. Check store settings and environment credentials.",
    );
  }

  return enabled[0]!;
}

export function getDeliveryProviderById(providerId: DeliveryProviderId): DeliveryProvider {
  if (providerId === "uber_direct" && !isUberConfigured()) {
    throw new Error("Uber Direct is not configured.");
  }

  if (providerId === "doordash_drive" && (!isDoorDashConfigured() || !isDoorDashEnabled())) {
    throw new Error("DoorDash Drive is not configured.");
  }

  return providersById[providerId];
}
