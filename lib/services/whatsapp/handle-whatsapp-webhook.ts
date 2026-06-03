import type { Prisma } from "@prisma/client";
import { webhookEventRepository } from "@/lib/db/repositories/webhook-event.repository";
import { whatsappRepository } from "@/lib/db/repositories/whatsapp.repository";
import { getWhatsAppConfig, isWhatsAppEnabled } from "@/lib/integrations/whatsapp/config";
import {
  parseIncomingMessages,
  verifyWebhookSignature,
} from "@/lib/integrations/whatsapp/webhook";
import { handleIncomingWhatsAppMessageSafe } from "@/lib/services/whatsapp/handle-incoming-message";
import { AppError } from "@/lib/utils/errors";
import { logger } from "@/lib/utils/logger";
import { checkRateLimit } from "@/lib/utils/rate-limit";
import { normalizeWhatsAppPhone } from "@/lib/utils/whatsapp-phone";

const WHATSAPP_RATE_LIMIT = 30;
const WHATSAPP_RATE_WINDOW_MS = 60_000;

export async function handleWhatsAppWebhook(
  rawBody: string,
  headers: Headers,
): Promise<void> {
  if (!isWhatsAppEnabled()) {
    throw new AppError("PROVIDER_ERROR", "WhatsApp integration is disabled", 503);
  }

  const config = getWhatsAppConfig();
  if (!config) {
    throw new AppError(
      "PROVIDER_ERROR",
      "WhatsApp credentials are incomplete. Check WHATSAPP_* env vars.",
      500,
    );
  }

  const signature = headers.get("x-hub-signature-256");
  if (!verifyWebhookSignature(rawBody, signature, config.appSecret)) {
    throw new AppError("UNAUTHORIZED", "Invalid webhook signature", 401);
  }

  const messages = parseIncomingMessages(rawBody);
  if (messages.length === 0) {
    logger.info("whatsapp.webhook.ignored", { reason: "no_text_messages" });
    return;
  }

  for (const message of messages) {
    const eventId = `whatsapp:${message.messageId}`;
    const { created } = await webhookEventRepository.createIfNotExists({
      eventId,
      eventType: "whatsapp.message.received",
      payload: {
        from: message.from,
        messageId: message.messageId,
        phoneNumberId: message.phoneNumberId,
      } as Prisma.InputJsonValue,
    });

    if (!created) {
      logger.info("whatsapp.webhook.duplicate", { messageId: message.messageId });
      continue;
    }

    const staffPhoneE164 = normalizeWhatsAppPhone(message.from);
    if (!staffPhoneE164) {
      logger.warn("whatsapp.webhook.invalid_phone", { from: message.from });
      continue;
    }

    const rateLimit = checkRateLimit(
      `whatsapp:${staffPhoneE164}`,
      WHATSAPP_RATE_LIMIT,
      WHATSAPP_RATE_WINDOW_MS,
    );

    if (!rateLimit.allowed) {
      logger.warn("whatsapp.webhook.rate_limited", {
        phoneSuffix: staffPhoneE164.slice(-4),
      });
      continue;
    }

    const store = await whatsappRepository.findStoreByPhoneNumberId(message.phoneNumberId);
    if (!store) {
      logger.warn("whatsapp.webhook.store_not_found", {
        phoneNumberId: message.phoneNumberId,
      });
      continue;
    }

    const isStaffAllowed = await whatsappRepository.isStaffAllowed(
      store.id,
      staffPhoneE164,
    );

    await handleIncomingWhatsAppMessageSafe({
      storeId: store.id,
      staffPhoneE164,
      text: message.text,
      phoneNumberId: message.phoneNumberId,
      isStaffAllowed,
      whatsappEnabled: store.whatsappEnabled,
      getConversation: () => whatsappRepository.getConversation(store.id, staffPhoneE164),
      saveConversation: async (conversation) => {
        await whatsappRepository.saveConversation({
          storeId: store.id,
          staffPhoneE164,
          state: conversation.state,
          payload: conversation.payload,
        });
      },
      clearConversation: () =>
        whatsappRepository.clearConversation(store.id, staffPhoneE164),
    });
  }
}
