import { requestStaffPasswordOtp } from "@/lib/services/staff/account";
import {
  STAFF_PASSWORD_OTP_LIMIT,
  STAFF_PASSWORD_OTP_WINDOW_MS,
  assertDurableRateLimit,
} from "@/lib/services/auth/login-protection";
import { handleApiError } from "@/lib/utils/errors";
import { requireStoreManager } from "@/lib/auth/session";
import { getRequestIpFromRequest } from "@/lib/utils/request-ip";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const user = await requireStoreManager();
    await assertDurableRateLimit({
      kind: "staff-password-otp",
      ip: getRequestIpFromRequest(request),
      subject: user.id,
      limit: STAFF_PASSWORD_OTP_LIMIT,
      windowMs: STAFF_PASSWORD_OTP_WINDOW_MS,
    });

    const data = await requestStaffPasswordOtp();
    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error);
  }
}
