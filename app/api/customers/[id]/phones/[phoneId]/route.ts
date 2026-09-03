import { NextResponse } from "next/server";
import { requireStoreManager } from "@/lib/auth/session";
import {
  deleteCustomerPhone,
  updateCustomerPhone,
} from "@/lib/services/customer/manage-contacts";
import { parseJsonBody } from "@/lib/utils/api-request";
import { customerPhoneInputSchema } from "@/lib/domain/customer/validation";
import { handleApiError } from "@/lib/utils/errors";

type RouteContext = {
  params: Promise<{ id: string; phoneId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    await requireStoreManager();
    const { id, phoneId } = await context.params;
    const body = await parseJsonBody(
      request,
      customerPhoneInputSchema.partial(),
    );
    const customer = await updateCustomerPhone(id, phoneId, body);
    return NextResponse.json({ data: customer });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    await requireStoreManager();
    const { id, phoneId } = await context.params;
    const customer = await deleteCustomerPhone(id, phoneId);
    return NextResponse.json({ data: customer });
  } catch (error) {
    return handleApiError(error);
  }
}
