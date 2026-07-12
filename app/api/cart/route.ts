import { NextResponse } from "next/server";
import { addCartItemSchema } from "@/lib/domain/cart/validation";
import { addCartItem, getCart } from "@/lib/services/cart/cart-actions";
import { parseJsonBody } from "@/lib/utils/api-request";
import { AppError, handleApiError } from "@/lib/utils/errors";
import { checkRateLimit } from "@/lib/utils/rate-limit";

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
    const rateLimit = checkRateLimit("cart-add:public", 60, 60_000);
    if (!rateLimit.allowed) {
      throw new AppError(
        "VALIDATION_ERROR",
        `Too many requests. Try again in ${rateLimit.retryAfterSeconds}s.`,
        429,
      );
    }

    const body = await parseJsonBody(request, addCartItemSchema);
    const cart = await addCartItem(body);
    return NextResponse.json({ data: cart }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
