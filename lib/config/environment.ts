import type { DeliveryProviderId } from "@/lib/domain/delivery/types";

/** Runtime environment helpers — server-side only. */
export function isUberLiveMode(): boolean {
  return process.env.UBER_LIVE_MODE === "true";
}

export function isDoorDashLiveMode(): boolean {
  return process.env.DOORDASH_LIVE_MODE === "true";
}

export function isUberConfigured(): boolean {
  return Boolean(
    process.env.UBER_CLIENT_ID?.trim() &&
      process.env.UBER_CLIENT_SECRET?.trim() &&
      process.env.UBER_CUSTOMER_ID?.trim(),
  );
}

export function isDoorDashConfigured(): boolean {
  return Boolean(
    process.env.DOORDASH_DEVELOPER_ID?.trim() &&
      process.env.DOORDASH_KEY_ID?.trim() &&
      process.env.DOORDASH_SIGNING_SECRET?.trim() &&
      process.env.DOORDASH_EXTERNAL_BUSINESS_ID?.trim(),
  );
}

/** DoorDash quoting is opt-in — off until Canada sandbox is approved. */
export function isDoorDashEnabled(): boolean {
  return process.env.DOORDASH_ENABLED === "true";
}

/** Providers with credentials configured in the environment. */
export function getConfiguredDeliveryProviderIds(): DeliveryProviderId[] {
  const providers: DeliveryProviderId[] = [];
  if (isUberConfigured()) {
    providers.push("uber_direct");
  }
  if (isDoorDashConfigured() && isDoorDashEnabled()) {
    providers.push("doordash_drive");
  }
  return providers;
}

export function isSandboxMode(): boolean {
  return !isUberLiveMode() && !isDoorDashLiveMode();
}

export function isProviderLiveMode(providerId: DeliveryProviderId): boolean {
  return providerId === "doordash_drive" ? isDoorDashLiveMode() : isUberLiveMode();
}

/** Store timezone for date display — configurable via env later. */
export function getStoreTimeZone(): string {
  return process.env.STORE_TIMEZONE?.trim() || "America/Toronto";
}
