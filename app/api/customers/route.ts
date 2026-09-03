import { NextResponse } from "next/server";
import { requireStoreManager } from "@/lib/auth/session";
import {
  createCustomerSchema,
  listCustomersQuerySchema,
} from "@/lib/domain/customer/validation";
import { createCustomer } from "@/lib/services/customer/create-customer";
import { listCustomers } from "@/lib/services/customer/list-customers";
import {
  CUSTOMER_CREATE_LIMIT,
  CUSTOMER_CREATE_WINDOW_MS,
  assertDurableRateLimit,
} from "@/lib/services/auth/login-protection";
import { parseJsonBody } from "@/lib/utils/api-request";
import { handleApiError } from "@/lib/utils/errors";
import { getRequestIpFromRequest } from "@/lib/utils/request-ip";

export async function GET(request: Request) {
  try {
    await requireStoreManager();

    const { searchParams } = new URL(request.url);
    const query = listCustomersQuerySchema.parse({
      q: searchParams.get("q") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      offset: searchParams.get("offset") ?? undefined,
    });

    const result = await listCustomers({
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
      kind: "customer-create",
      ip: getRequestIpFromRequest(request),
      subject: user.id,
      limit: CUSTOMER_CREATE_LIMIT,
      windowMs: CUSTOMER_CREATE_WINDOW_MS,
    });

    const body = await parseJsonBody(request, createCustomerSchema);
    const result = await createCustomer(body);

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
