import { requestStaffPasswordOtp } from "@/lib/services/staff/account";
import { AppError, handleApiError } from "@/lib/utils/errors";
import { checkRateLimit } from "@/lib/utils/rate-limit";
import { requireStoreManager } from "@/lib/auth/session";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const user = await requireStoreManager();
    const rateLimit = checkRateLimit(
      `staff-password-otp:${user.id}`,
      5,
      60_000,
    );
    if (!rateLimit.allowed) {
      throw new AppError(
        "VALIDATION_ERROR",
        `Too many code requests. Try again in ${rateLimit.retryAfterSeconds}s.`,
        429,
      );
    }

    const data = await requestStaffPasswordOtp();
    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error);
  }
}
