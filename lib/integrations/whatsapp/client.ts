import {
  getWhatsAppGraphBaseUrl,
  requireWhatsAppConfig,
  type WhatsAppConfig,
} from "@/lib/integrations/whatsapp/config";
import { AppError } from "@/lib/utils/errors";
import { logger } from "@/lib/utils/logger";

type SendTextMessageInput = {
  to: string;
  body: string;
  phoneNumberId?: string;
  config?: WhatsAppConfig;
};

function stripPhonePrefix(phoneE164: string): string {
  return phoneE164.replace(/\D/g, "");
}

export async function sendTextMessage(input: SendTextMessageInput): Promise<void> {
  const config = input.config ?? requireWhatsAppConfig();
  const phoneNumberId = input.phoneNumberId ?? config.phoneNumberId;
  const url = `${getWhatsAppGraphBaseUrl(config.apiVersion)}/${phoneNumberId}/messages`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: stripPhonePrefix(input.to),
      type: "text",
      text: {
        body: input.body,
        preview_url: input.body.includes("https://"),
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    logger.error("whatsapp.send.failed", {
      status: response.status,
      body: errorBody.slice(0, 500),
    });
    throw new AppError(
      "PROVIDER_ERROR",
      "Unable to send WhatsApp message. Check Meta API credentials.",
      502,
    );
  }
}
