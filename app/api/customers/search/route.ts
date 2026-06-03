import { NextResponse } from "next/server";
import { requireStoreManager } from "@/lib/auth/session";
import { searchCustomersQuerySchema } from "@/lib/domain/customer/validation";
import { searchCustomers } from "@/lib/services/customer/search-customers";
import { handleApiError } from "@/lib/utils/errors";

export async function GET(request: Request) {
  try {
    await requireStoreManager();

    const { searchParams } = new URL(request.url);
    const query = searchCustomersQuerySchema.parse({
      q: searchParams.get("q") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    });

    const items = await searchCustomers({
      search: query.q,
      limit: query.limit,
    });

    return NextResponse.json({ data: { items } });
  } catch (error) {
    return handleApiError(error);
  }
}
