import { NextResponse } from "next/server";
import { requireStoreManager } from "@/lib/auth/session";
import { updateMenuItemSchema } from "@/lib/domain/menu/validation";
import { getMenuItem } from "@/lib/services/menu/get-menu-item";
import { updateMenuItem } from "@/lib/services/menu/update-menu-item";
import { parseJsonBody } from "@/lib/utils/api-request";
import { handleApiError } from "@/lib/utils/errors";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    await requireStoreManager();
    const { id } = await context.params;
    const item = await getMenuItem(id);
    return NextResponse.json({ data: item });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    await requireStoreManager();
    const { id } = await context.params;
    const body = await parseJsonBody(request, updateMenuItemSchema);
    const item = await updateMenuItem(id, body);
    return NextResponse.json({ data: item });
  } catch (error) {
    return handleApiError(error);
  }
}
