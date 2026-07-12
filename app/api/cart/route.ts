import { NextResponse } from "next/server";
import { addCartItemSchema } from "@/lib/domain/cart/validation";
import { addCartItem, getCart } from "@/lib/services/cart/cart-actions";
import {
  CART_ADD_LIMIT,
  CART_ADD_WINDOW_MS,
  assertDurableRateLimit,
} from "@/lib/services/auth/login-protection";
import { parseJsonBody } from "@/lib/utils/api-request";
import { handleApiError } from "@/lib/utils/errors";
import { getRequestIpFromRequest } from "@/lib/utils/request-ip";

export async function GET() {
  try {
    const cart = await getCart();
    return NextResponse.json({ data: cart });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    await assertDurableRateLimit({
      kind: "cart-add",
      ip: getRequestIpFromRequest(request),
      limit: CART_ADD_LIMIT,
      windowMs: CART_ADD_WINDOW_MS,
    });

    const body = await parseJsonBody(request, addCartItemSchema);
    const cart = await addCartItem(body);
    return NextResponse.json({ data: cart }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
