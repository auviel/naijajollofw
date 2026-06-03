import { getWhatsAppVerifyToken } from "@/lib/integrations/whatsapp/config";
import { verifyWebhookChallenge } from "@/lib/integrations/whatsapp/webhook";
import { handleWhatsAppWebhook } from "@/lib/services/whatsapp/handle-whatsapp-webhook";
import { handleApiError } from "@/lib/utils/errors";
import { logger } from "@/lib/utils/logger";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const expectedVerifyToken = getWhatsAppVerifyToken();

    if (!expectedVerifyToken) {
      return new Response("WhatsApp verify token is not configured", { status: 500 });
    }

    const challenge = verifyWebhookChallenge({
      mode: url.searchParams.get("hub.mode"),
      verifyToken: url.searchParams.get("hub.verify_token"),
      challenge: url.searchParams.get("hub.challenge"),
      expectedVerifyToken,
    });

    if (!challenge) {
      return new Response("Forbidden", { status: 403 });
    }

    return new Response(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  } catch (error) {
    logger.error("whatsapp.webhook.verify.failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    await handleWhatsAppWebhook(rawBody, request.headers);
    return new Response(null, { status: 200 });
  } catch (error) {
    logger.error("whatsapp.webhook.failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return handleApiError(error);
  }
}
