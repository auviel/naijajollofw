import { AppError } from "@/lib/utils/errors";

export type DoorDashConfig = {
  developerId: string;
  keyId: string;
  signingSecret: string;
  externalBusinessId: string;
  apiBase: string;
  liveMode: boolean;
};

export function getDoorDashConfig(): DoorDashConfig {
  const developerId = process.env.DOORDASH_DEVELOPER_ID?.trim();
  const keyId = process.env.DOORDASH_KEY_ID?.trim();
  const signingSecret = process.env.DOORDASH_SIGNING_SECRET?.trim();
  const externalBusinessId = process.env.DOORDASH_EXTERNAL_BUSINESS_ID?.trim();

  if (!developerId || !keyId || !signingSecret || !externalBusinessId) {
    throw new AppError(
      "PROVIDER_ERROR",
      "DoorDash Drive is not configured. Set DOORDASH_DEVELOPER_ID, DOORDASH_KEY_ID, DOORDASH_SIGNING_SECRET, and DOORDASH_EXTERNAL_BUSINESS_ID.",
      500,
    );
  }

  return {
    developerId,
    keyId,
    signingSecret,
    externalBusinessId,
    apiBase:
      process.env.DOORDASH_API_BASE?.trim() || "https://openapi.doordash.com",
    liveMode: process.env.DOORDASH_LIVE_MODE === "true",
  };
}

export function getDoorDashExternalStoreIdFromEnv(): string | null {
  const value = process.env.DOORDASH_EXTERNAL_STORE_ID?.trim();
  return value || null;
}

export function getDoorDashWebhookAuthorization(): string | null {
  const value = process.env.DOORDASH_WEBHOOK_AUTHORIZATION?.trim();
  return value || null;
}
