import { NextResponse } from "next/server";
import { requireStoreManager } from "@/lib/auth/session";
import { createMenuItemSchema } from "@/lib/domain/menu/validation";
import { createMenuItem } from "@/lib/services/menu/create-menu-item";
import { parseJsonBody } from "@/lib/utils/api-request";
import { AppError, handleApiError } from "@/lib/utils/errors";
import { checkRateLimit } from "@/lib/utils/rate-limit";

export async function POST(request: Request) {
  try {
    const user = await requireStoreManager();
    const rateLimit = checkRateLimit(`menu-item-create:${user.id}`, 40, 60_000);
    if (!rateLimit.allowed) {
      throw new AppError(
        "VALIDATION_ERROR",
        `Too many requests. Try again in ${rateLimit.retryAfterSeconds}s.`,
        429,
      );
    }

    const body = await parseJsonBody(request, createMenuItemSchema);
    const item = await createMenuItem(body);
    return NextResponse.json({ data: item }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
