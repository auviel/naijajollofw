import { NextResponse } from "next/server";
import { requireStoreManager } from "@/lib/auth/session";
import { listOrdersQuerySchema } from "@/lib/domain/order/validation-staff";
import { listStaffOrders } from "@/lib/services/order/list-staff-orders";
import { parseSearchParams } from "@/lib/utils/api-request";
import { handleApiError } from "@/lib/utils/errors";

export async function GET(request: Request) {
  try {
    await requireStoreManager();
    const query = parseSearchParams(
      new URL(request.url).searchParams,
      listOrdersQuerySchema,
      (params) => ({
        filter: params.get("filter") ?? undefined,
        q: params.get("q") ?? undefined,
        limit: params.get("limit") ?? undefined,
      }),
    );

    const result = await listStaffOrders({
      filter: query.filter,
      search: query.q,
      limit: query.limit,
    });

    return NextResponse.json({ data: result });
  } catch (error) {
    return handleApiError(error);
  }
}
