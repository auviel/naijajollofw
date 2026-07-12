import { NextResponse } from "next/server";
import { requireStoreManager } from "@/lib/auth/session";
import { createCategorySchema } from "@/lib/domain/menu/validation";
import { createMenuCategory } from "@/lib/services/menu/create-category";
import { parseJsonBody } from "@/lib/utils/api-request";
import { AppError, handleApiError } from "@/lib/utils/errors";
import { checkRateLimit } from "@/lib/utils/rate-limit";

export async function POST(request: Request) {
  try {
    const user = await requireStoreManager();
    const rateLimit = checkRateLimit(`menu-category-create:${user.id}`, 30, 60_000);
    if (!rateLimit.allowed) {
      throw new AppError(
        "VALIDATION_ERROR",
        `Too many requests. Try again in ${rateLimit.retryAfterSeconds}s.`,
        429,
      );
    }

    const body = await parseJsonBody(request, createCategorySchema);
    const category = await createMenuCategory(body);
    return NextResponse.json({ data: category }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
