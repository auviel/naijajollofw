import { NextResponse } from "next/server";
import { requireStoreManager } from "@/lib/auth/session";
import {
  createDeliverySchema,
  listDeliveriesQuerySchema,
} from "@/lib/domain/delivery/validation";
import { createDelivery } from "@/lib/services/delivery/create-delivery";
import { listDeliveries } from "@/lib/services/delivery/list-deliveries";
import {
  DELIVERY_CREATE_LIMIT,
  DELIVERY_CREATE_WINDOW_MS,
  assertDurableRateLimit,
} from "@/lib/services/auth/login-protection";
import { parseJsonBody } from "@/lib/utils/api-request";
import { handleApiError } from "@/lib/utils/errors";
import { getRequestIpFromRequest } from "@/lib/utils/request-ip";

export async function GET(request: Request) {
  try {
    await requireStoreManager();

    const { searchParams } = new URL(request.url);
    const query = listDeliveriesQuerySchema.parse({
      filter: searchParams.get("filter") ?? undefined,
      q: searchParams.get("q") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      offset: searchParams.get("offset") ?? undefined,
    });

    const result = await listDeliveries({
      filter: query.filter,
      search: query.q,
      limit: query.limit,
      offset: query.offset,
    });

    return NextResponse.json({ data: result });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireStoreManager();

    await assertDurableRateLimit({
      kind: "delivery-create",
      ip: getRequestIpFromRequest(request),
      subject: user.id,
      limit: DELIVERY_CREATE_LIMIT,
      windowMs: DELIVERY_CREATE_WINDOW_MS,
    });

    const body = await parseJsonBody(request, createDeliverySchema);
    const result = await createDelivery(body);

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
