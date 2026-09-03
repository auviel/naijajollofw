import { confirmStaffPasswordChange } from "@/lib/services/staff/account";
import { parseJsonBody } from "@/lib/utils/api-request";
import { AppError, handleApiError } from "@/lib/utils/errors";
import { checkRateLimit } from "@/lib/utils/rate-limit";
import { requireStoreManager } from "@/lib/auth/session";
import { staffPasswordConfirmSchema } from "@/lib/domain/account/validation-staff";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const user = await requireStoreManager();
    const rateLimit = checkRateLimit(
      `staff-password-confirm:${user.id}`,
      10,
      60_000,
    );
    if (!rateLimit.allowed) {
      throw new AppError(
        "VALIDATION_ERROR",
        `Too many attempts. Try again in ${rateLimit.retryAfterSeconds}s.`,
        429,
      );
    }

    const body = await parseJsonBody(request, staffPasswordConfirmSchema);
    await confirmStaffPasswordChange(body);
    return NextResponse.json({ data: { ok: true } });
  } catch (error) {
    return handleApiError(error);
  }
}
