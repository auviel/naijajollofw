import { NextResponse } from "next/server";
import { requireStoreManager } from "@/lib/auth/session";
import {
  deleteCustomerAddress,
  updateCustomerAddress,
} from "@/lib/services/customer/manage-contacts";
import { parseJsonBody } from "@/lib/utils/api-request";
import { customerAddressInputSchema } from "@/lib/domain/customer/validation";
import { handleApiError } from "@/lib/utils/errors";

type RouteContext = {
  params: Promise<{ id: string; addressId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    await requireStoreManager();
    const { id, addressId } = await context.params;
    const body = await parseJsonBody(
      request,
      customerAddressInputSchema.partial(),
    );
    const customer = await updateCustomerAddress(id, addressId, body);
    return NextResponse.json({ data: customer });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    await requireStoreManager();
    const { id, addressId } = await context.params;
    const customer = await deleteCustomerAddress(id, addressId);
    return NextResponse.json({ data: customer });
  } catch (error) {
    return handleApiError(error);
  }
}
