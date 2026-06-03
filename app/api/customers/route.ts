import { NextResponse } from "next/server";
import { requireStoreManager } from "@/lib/auth/session";
import {
  createCustomerSchema,
  listCustomersQuerySchema,
} from "@/lib/domain/customer/validation";
import { createCustomer } from "@/lib/services/customer/create-customer";
import { listCustomers } from "@/lib/services/customer/list-customers";
import { parseJsonBody } from "@/lib/utils/api-request";
import { handleApiError, AppError } from "@/lib/utils/errors";
import { checkRateLimit } from "@/lib/utils/rate-limit";

const CREATE_RATE_LIMIT = 20;
const CREATE_RATE_WINDOW_MS = 60_000;

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

    const rateLimit = checkRateLimit(
      `customer-create:${user.id}`,
      CREATE_RATE_LIMIT,
      CREATE_RATE_WINDOW_MS,
    );

    if (!rateLimit.allowed) {
      throw new AppError(
        "VALIDATION_ERROR",
        `Too many requests. Try again in ${rateLimit.retryAfterSeconds}s.`,
        429,
      );
    }

    const body = await parseJsonBody(request, createCustomerSchema);
    const result = await createCustomer(body);

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
