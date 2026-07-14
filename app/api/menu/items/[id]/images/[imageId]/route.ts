import { NextResponse } from "next/server";
import { requireStoreManager } from "@/lib/auth/session";
import { deleteMenuItemImage } from "@/lib/services/media/delete-menu-image";
import { AppError, handleApiError } from "@/lib/utils/errors";
import { checkRateLimit } from "@/lib/utils/rate-limit";

type RouteContext = {
  params: Promise<{ id: string; imageId: string }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const user = await requireStoreManager();
    const rateLimit = checkRateLimit(`menu-image-delete:${user.id}`, 40, 60_000);
    if (!rateLimit.allowed) {
      throw new AppError(
        "VALIDATION_ERROR",
        `Too many requests. Try again in ${rateLimit.retryAfterSeconds}s.`,
        429,
      );
    }

    const { id, imageId } = await context.params;
    const result = await deleteMenuItemImage(id, imageId);
    return NextResponse.json({ data: result });
  } catch (error) {
    return handleApiError(error);
  }
}
