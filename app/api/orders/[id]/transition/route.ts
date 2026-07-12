import { NextResponse } from "next/server";
import { z } from "zod";
import { requireStoreManager } from "@/lib/auth/session";
import { orderTransitionSchema } from "@/lib/domain/order/validation-staff";
import { transitionStaffOrder } from "@/lib/services/order/transition-staff-order";
import { parseJsonBody } from "@/lib/utils/api-request";
import { handleApiError } from "@/lib/utils/errors";

const paramsSchema = z.object({
  id: z.string().cuid(),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    await requireStoreManager();
    const { id } = paramsSchema.parse(await context.params);
    const body = await parseJsonBody(request, orderTransitionSchema);
    const order = await transitionStaffOrder(id, body);
    return NextResponse.json({ data: order });
  } catch (error) {
    return handleApiError(error);
  }
}
