import { NextResponse } from "next/server";
import { requireStoreManager } from "@/lib/auth/session";
import { updateCustomerSchema } from "@/lib/domain/customer/validation";
import { getCustomer } from "@/lib/services/customer/get-customer";
import { updateCustomer } from "@/lib/services/customer/update-customer";
import { parseJsonBody } from "@/lib/utils/api-request";
import { handleApiError } from "@/lib/utils/errors";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    await requireStoreManager();
    const { id } = await context.params;
    const customer = await getCustomer(id);

    return NextResponse.json({ data: customer });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    await requireStoreManager();
    const { id } = await context.params;
    const body = await parseJsonBody(request, updateCustomerSchema);
    const customer = await updateCustomer(id, body);

    return NextResponse.json({ data: customer });
  } catch (error) {
    return handleApiError(error);
  }
}
