import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getDoorDashExternalStoreId,
  getStoreEnabledProviderIds,
} from "@/lib/domain/store/delivery-settings";
import type { StoreProfile } from "@/lib/domain/store/types";

const store: StoreProfile = {
  id: "seed-store-waterloo",
  name: "Demo Market",
  phone: "+15195550199",
  email: "hello@naijajollofw.ca",
  addressLine1: "280 Lester St",
  city: "Waterloo",
  province: "ON",
  postalCode: "N2L 0G2",
  country: "CA",
  latitude: 43.478885,
  longitude: -80.524498,
  enabledUberDirect: true,
  enabledDoorDashDrive: false,
};

describe("getDoorDashExternalStoreId", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("falls back to Store.id when env is unset", () => {
    expect(getDoorDashExternalStoreId(store)).toBe("seed-store-waterloo");
  });

  it("uses DOORDASH_EXTERNAL_STORE_ID from env when set", () => {
    vi.stubEnv("DOORDASH_EXTERNAL_STORE_ID", "default");
    expect(getDoorDashExternalStoreId(store)).toBe("default");
  });
});

describe("getStoreEnabledProviderIds", () => {
  it("returns only enabled providers for the store", () => {
    expect(getStoreEnabledProviderIds(store)).toEqual(["uber_direct"]);
    expect(
      getStoreEnabledProviderIds({
        ...store,
        enabledDoorDashDrive: true,
      }),
    ).toEqual(["uber_direct", "doordash_drive"]);
  });
});
