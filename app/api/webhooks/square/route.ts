import { handleSquareWebhook } from "@/lib/services/order/handle-square-webhook";
import { handleApiError } from "@/lib/utils/errors";
import { logger } from "@/lib/utils/logger";

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-square-hmacsha256-signature");
    await handleSquareWebhook(rawBody, signature);
    return new Response(null, { status: 200 });
  } catch (error) {
    logger.error("square.webhook.handler.failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return handleApiError(error);
  }
}
