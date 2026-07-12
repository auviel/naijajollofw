import { NextResponse } from "next/server";
import { updateCartItemSchema } from "@/lib/domain/cart/validation";
import { removeCartItem, updateCartItem } from "@/lib/services/cart/cart-actions";
import { readCartSessionId } from "@/lib/services/cart/session";
import { parseJsonBody } from "@/lib/utils/api-request";
import { handleApiError } from "@/lib/utils/errors";

type RouteContext = {
  params: Promise<{ lineId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { lineId } = await context.params;
    const body = await parseJsonBody(request, updateCartItemSchema);
    const cart = await updateCartItem(lineId, body);
    const sessionId = await readCartSessionId();
    return NextResponse.json({ data: cart, sessionId });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { lineId } = await context.params;
    const cart = await removeCartItem(lineId);
    const sessionId = await readCartSessionId();
    return NextResponse.json({ data: cart, sessionId });
  } catch (error) {
    return handleApiError(error);
  }
}
