import { NextResponse } from "next/server";
import { requireStoreManager } from "@/lib/auth/session";
import { uploadMenuItemImage } from "@/lib/services/media/upload-menu-image";
import { AppError, handleApiError } from "@/lib/utils/errors";
import { checkRateLimit } from "@/lib/utils/rate-limit";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const user = await requireStoreManager();
    const rateLimit = checkRateLimit(`menu-image-upload:${user.id}`, 20, 60_000);
    if (!rateLimit.allowed) {
      throw new AppError(
        "VALIDATION_ERROR",
        `Too many uploads. Try again in ${rateLimit.retryAfterSeconds}s.`,
        429,
      );
    }

    const { id } = await context.params;
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      throw new AppError(
        "VALIDATION_ERROR",
        "Choose an image file to upload.",
        400,
      );
    }

    const result = await uploadMenuItemImage(id, file);
    return NextResponse.json({ data: result });
  } catch (error) {
    return handleApiError(error);
  }
}
