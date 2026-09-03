import { requireStoreManager } from "@/lib/auth/session";
import { createQuoteSchema } from "@/lib/domain/delivery/validation";
import {
  DELIVERY_QUOTE_LIMIT,
  DELIVERY_QUOTE_WINDOW_MS,
  assertDurableRateLimit,
} from "@/lib/services/auth/login-protection";
import { createQuote } from "@/lib/services/delivery/create-quote";
import { parseJsonBody } from "@/lib/utils/api-request";
import { handleApiError } from "@/lib/utils/errors";
import { getRequestIpFromRequest } from "@/lib/utils/request-ip";

export async function POST(request: Request) {
  try {
    const user = await requireStoreManager();

    await assertDurableRateLimit({
      kind: "delivery-quote",
      ip: getRequestIpFromRequest(request),
      subject: user.id,
      limit: DELIVERY_QUOTE_LIMIT,
      windowMs: DELIVERY_QUOTE_WINDOW_MS,
    });

    const body = await parseJsonBody(request, createQuoteSchema);
    const result = await createQuote(body);

    return Response.json({ data: result });
  } catch (error) {
    return handleApiError(error);
  }
}
