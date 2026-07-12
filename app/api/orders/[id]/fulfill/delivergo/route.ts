import { NextResponse } from "next/server";
import { z } from "zod";
import { requireStoreManager } from "@/lib/auth/session";
import { fulfillDelivergoSchema } from "@/lib/domain/order/validation-staff";
import { fulfillOrderDelivergo } from "@/lib/services/order/fulfill-delivergo";
import { parseJsonBody } from "@/lib/utils/api-request";
import { AppError, handleApiError } from "@/lib/utils/errors";
import { checkRateLimit } from "@/lib/utils/rate-limit";

const paramsSchema = z.object({
  id: z.string().cuid(),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    await requireStoreManager();
    const rateLimit = checkRateLimit("order-fulfill-delivergo", 20, 60_000);
    if (!rateLimit.allowed) {
      throw new AppError(
        "VALIDATION_ERROR",
        `Too many requests. Try again in ${rateLimit.retryAfterSeconds}s.`,
        429,
      );
    }

    const { id } = paramsSchema.parse(await context.params);
    const body = await parseJsonBody(request, fulfillDelivergoSchema);
    const order = await fulfillOrderDelivergo(id, body);
    return NextResponse.json({ data: order }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
