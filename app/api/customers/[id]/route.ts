import { NextResponse } from "next/server";
import { requireStoreManager } from "@/lib/auth/session";
import { updateCustomerSchema } from "@/lib/domain/customer/validation";
import { deleteCustomer } from "@/lib/services/customer/delete-customer";
import { getCustomer } from "@/lib/services/customer/get-customer";
import { updateCustomer } from "@/lib/services/customer/update-customer";
import {
  orderRepository,
  toStaffListItems,
} from "@/lib/db/repositories/order.repository";
import { parseJsonBody } from "@/lib/utils/api-request";
import { handleApiError } from "@/lib/utils/errors";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const user = await requireStoreManager();
    const { id } = await context.params;
    const customer = await getCustomer(id);
    const orders = await orderRepository.findManyForCustomer(
      id,
      user.storeId,
      12,
    );

    return NextResponse.json({
      data: {
        ...customer,
        recentOrders: await toStaffListItems(orders),
      },
    });
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

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    await requireStoreManager();
    const { id } = await context.params;
    await deleteCustomer(id);
    return NextResponse.json({ data: { ok: true } });
  } catch (error) {
    return handleApiError(error);
  }
}
