import { NextResponse } from "next/server";
import { requireStoreManager } from "@/lib/auth/session";
import { updateCategorySchema } from "@/lib/domain/menu/validation";
import { updateMenuCategory } from "@/lib/services/menu/update-category";
import { parseJsonBody } from "@/lib/utils/api-request";
import { handleApiError } from "@/lib/utils/errors";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    await requireStoreManager();
    const { id } = await context.params;
    const body = await parseJsonBody(request, updateCategorySchema);
    const category = await updateMenuCategory(id, body);
    return NextResponse.json({ data: category });
  } catch (error) {
    return handleApiError(error);
  }
}
