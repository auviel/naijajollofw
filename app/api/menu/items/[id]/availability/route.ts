import { NextResponse } from "next/server";
import { requireStoreManager } from "@/lib/auth/session";
import { setItemAvailabilitySchema } from "@/lib/domain/menu/validation";
import { setMenuItemAvailability } from "@/lib/services/menu/set-item-availability";
import { parseJsonBody } from "@/lib/utils/api-request";
import { handleApiError } from "@/lib/utils/errors";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    await requireStoreManager();
    const { id } = await context.params;
    const body = await parseJsonBody(request, setItemAvailabilitySchema);
    const item = await setMenuItemAvailability(id, body);
    return NextResponse.json({ data: item });
  } catch (error) {
    return handleApiError(error);
  }
}
