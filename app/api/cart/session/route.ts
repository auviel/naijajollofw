import { NextResponse } from "next/server";
import { z } from "zod";
import { cartRepository } from "@/lib/db/repositories/cart.repository";
import {
  isCartSessionId,
  readCartSessionId,
  restoreCartSessionId,
  touchCartSessionCookie,
} from "@/lib/services/cart/session";
import { resolvePublicStoreId } from "@/lib/services/storefront/resolve-public-store";
import { parseJsonBody } from "@/lib/utils/api-request";
import { handleApiError } from "@/lib/utils/errors";

const restoreSchema = z.object({
  sessionId: z.string().trim().max(64).optional(),
});

/**
 * GET — return + sliding-refresh the current cart cookie (for localStorage sync).
 * POST — restore a guest cart cookie from a client backup after Safari ITP expiry.
 */
export async function GET() {
  try {
    const sessionId = await readCartSessionId();
    if (sessionId) {
      await touchCartSessionCookie(sessionId);
    }
    return NextResponse.json({ data: { sessionId } });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await parseJsonBody(request, restoreSchema);
    const cookieSid = await readCartSessionId();

    if (cookieSid) {
      await touchCartSessionCookie(cookieSid);
      return NextResponse.json({ data: { sessionId: cookieSid } });
    }

    const backup = body.sessionId?.trim();
    if (backup && isCartSessionId(backup)) {
      const storeId = await resolvePublicStoreId();
      const cart = await cartRepository.findByStoreAndSession(storeId, backup);
      if (cart) {
        const restored = await restoreCartSessionId(backup);
        return NextResponse.json({ data: { sessionId: restored } });
      }
    }

    return NextResponse.json({ data: { sessionId: null } });
  } catch (error) {
    return handleApiError(error);
  }
}
