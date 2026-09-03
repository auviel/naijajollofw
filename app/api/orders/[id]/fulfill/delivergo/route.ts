import { NextResponse } from "next/server";
import { z } from "zod";
import { requireStoreManager } from "@/lib/auth/session";
import { orderIdParamSchema } from "@/lib/domain/order/ids";
import { fulfillDelivergoSchema } from "@/lib/domain/order/validation-staff";
import {
  ORDER_FULFILL_LIMIT,
  ORDER_FULFILL_WINDOW_MS,
  assertDurableRateLimit,
} from "@/lib/services/auth/login-protection";
import { fulfillOrderDelivergo } from "@/lib/services/order/fulfill-delivergo";
import { parseJsonBody } from "@/lib/utils/api-request";
import { handleApiError } from "@/lib/utils/errors";
import { getRequestIpFromRequest } from "@/lib/utils/request-ip";

const paramsSchema = z.object({
  id: orderIdParamSchema,
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const user = await requireStoreManager();
    await assertDurableRateLimit({
      kind: "order-fulfill",
      ip: getRequestIpFromRequest(request),
      subject: user.id,
      limit: ORDER_FULFILL_LIMIT,
      windowMs: ORDER_FULFILL_WINDOW_MS,
    });

    const { id } = paramsSchema.parse(await context.params);
    const body = await parseJsonBody(request, fulfillDelivergoSchema);
    const order = await fulfillOrderDelivergo(id, body);
    return NextResponse.json({ data: order }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
