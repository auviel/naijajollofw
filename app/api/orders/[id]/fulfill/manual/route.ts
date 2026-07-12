import { NextResponse } from "next/server";
import { z } from "zod";
import { requireStoreManager } from "@/lib/auth/session";
import { fulfillManualSchema } from "@/lib/domain/order/validation-staff";
import { fulfillOrderManual } from "@/lib/services/order/fulfill-manual";
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
    const body = await parseJsonBody(request, fulfillManualSchema);
    const order = await fulfillOrderManual(id, body);
    return NextResponse.json({ data: order });
  } catch (error) {
    return handleApiError(error);
  }
}
