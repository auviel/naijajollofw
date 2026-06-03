import { AppError } from "@/lib/utils/errors";

export type WhatsAppConfig = {
  enabled: boolean;
  accessToken: string;
  appSecret: string;
  verifyToken: string;
  phoneNumberId: string;
  businessAccountId?: string;
  apiVersion: string;
};

export function isWhatsAppEnabled(): boolean {
  return process.env.WHATSAPP_ENABLED === "true";
}

export function getWhatsAppVerifyToken(): string | null {
  return process.env.WHATSAPP_VERIFY_TOKEN?.trim() || null;
}

export function getWhatsAppConfig(): WhatsAppConfig | null {
  if (!isWhatsAppEnabled()) {
    return null;
  }

  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  const appSecret = process.env.WHATSAPP_APP_SECRET?.trim();
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN?.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();

  if (!accessToken || !appSecret || !verifyToken || !phoneNumberId) {
    return null;
  }

  return {
    enabled: true,
    accessToken,
    appSecret,
    verifyToken,
    phoneNumberId,
    businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID?.trim() || undefined,
    apiVersion: process.env.WHATSAPP_API_VERSION?.trim() || "v21.0",
  };
}

export function requireWhatsAppConfig(): WhatsAppConfig {
  const config = getWhatsAppConfig();
  if (!config) {
    throw new AppError(
      "PROVIDER_ERROR",
      "WhatsApp is not configured. Set WHATSAPP_ENABLED=true and all WHATSAPP_* credentials.",
      500,
    );
  }

  return config;
}

export function getWhatsAppGraphBaseUrl(apiVersion: string): string {
  return `https://graph.facebook.com/${apiVersion}`;
}
