import { NextResponse } from "next/server";
import {
  FORGOT_PASSWORD_LIMIT,
  FORGOT_PASSWORD_WINDOW_MS,
  assertDurableRateLimit,
} from "@/lib/services/auth/login-protection";
import { requestStaffPasswordReset } from "@/lib/services/staff/password-reset";
import { handleApiError } from "@/lib/utils/errors";
import { getRequestIpFromRequest } from "@/lib/utils/request-ip";

export async function POST(request: Request) {
  try {
    const ip = getRequestIpFromRequest(request);
    await assertDurableRateLimit({
      kind: "forgot",
      ip,
      limit: FORGOT_PASSWORD_LIMIT,
      windowMs: FORGOT_PASSWORD_WINDOW_MS,
    });

    const body = await request.json();
    const data = await requestStaffPasswordReset(body);
    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error);
  }
}
