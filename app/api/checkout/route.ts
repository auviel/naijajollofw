import { NextResponse } from "next/server";
import { checkoutRequestSchema } from "@/lib/domain/order/validation";
import { checkoutWithSquare } from "@/lib/services/order/checkout";
import { parseJsonBody } from "@/lib/utils/api-request";
import { AppError, handleApiError } from "@/lib/utils/errors";
import { checkRateLimit } from "@/lib/utils/rate-limit";

export async function POST(request: Request) {
  try {
    const rateLimit = checkRateLimit("checkout:public", 20, 60_000);
    if (!rateLimit.allowed) {
      throw new AppError(
        "VALIDATION_ERROR",
        `Too many requests. Try again in ${rateLimit.retryAfterSeconds}s.`,
        429,
      );
    }

    const body = await parseJsonBody(request, checkoutRequestSchema);
    const result = await checkoutWithSquare(body);
    return NextResponse.json({ data: result.order }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
