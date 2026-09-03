import { mobileLoginSchema } from "@/lib/domain/auth/mobile";
import {
  MOBILE_LOGIN_LIMIT,
  MOBILE_LOGIN_WINDOW_MS,
  assertDurableRateLimit,
} from "@/lib/services/auth/login-protection";
import { mobileLogin } from "@/lib/services/auth/mobile-auth";
import { parseJsonBody } from "@/lib/utils/api-request";
import { handleApiError } from "@/lib/utils/errors";
import { getRequestIpFromRequest } from "@/lib/utils/request-ip";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    await assertDurableRateLimit({
      kind: "mobile-login",
      ip: getRequestIpFromRequest(request),
      limit: MOBILE_LOGIN_LIMIT,
      windowMs: MOBILE_LOGIN_WINDOW_MS,
    });
    const body = await parseJsonBody(request, mobileLoginSchema);
    const data = await mobileLogin(body);
    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error);
  }
}
