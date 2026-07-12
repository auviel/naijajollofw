import { NextResponse } from "next/server";
import { checkoutRequestSchema } from "@/lib/domain/order/validation";
import {
  CHECKOUT_LIMIT,
  CHECKOUT_WINDOW_MS,
  assertDurableRateLimit,
} from "@/lib/services/auth/login-protection";
import { checkoutWithSquare } from "@/lib/services/order/checkout";
import { parseJsonBody } from "@/lib/utils/api-request";
import { handleApiError } from "@/lib/utils/errors";
import { getRequestIpFromRequest } from "@/lib/utils/request-ip";

export async function POST(request: Request) {
  try {
    await assertDurableRateLimit({
      kind: "checkout",
      ip: getRequestIpFromRequest(request),
      limit: CHECKOUT_LIMIT,
      windowMs: CHECKOUT_WINDOW_MS,
    });

    const body = await parseJsonBody(request, checkoutRequestSchema);
    const result = await checkoutWithSquare(body);
    return NextResponse.json({ data: result.order }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
