import { NextResponse } from "next/server";
import { requestDinerPasswordReset } from "@/lib/services/diner/password-reset";
import {
  FORGOT_PASSWORD_LIMIT,
  FORGOT_PASSWORD_WINDOW_MS,
  assertDurableRateLimit,
} from "@/lib/services/auth/login-protection";
import { getRequestIpFromRequest } from "@/lib/utils/request-ip";
import { handleApiError } from "@/lib/utils/errors";

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
    await requestDinerPasswordReset(body);
    return NextResponse.json({
      data: {
        ok: true,
        message:
          "If an account exists for that email, we sent a reset link.",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
