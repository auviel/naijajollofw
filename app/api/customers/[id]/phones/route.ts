import { NextResponse } from "next/server";
import { requireStoreManager } from "@/lib/auth/session";
import { addCustomerPhone } from "@/lib/services/customer/manage-contacts";
import { parseJsonBody } from "@/lib/utils/api-request";
import { customerPhoneInputSchema } from "@/lib/domain/customer/validation";
import { handleApiError } from "@/lib/utils/errors";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    await requireStoreManager();
    const { id } = await context.params;
    const body = await parseJsonBody(request, customerPhoneInputSchema);
    const customer = await addCustomerPhone(id, body);
    return NextResponse.json({ data: customer });
  } catch (error) {
    return handleApiError(error);
  }
}
