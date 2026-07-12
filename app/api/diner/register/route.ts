import { NextResponse } from "next/server";
import { registerDiner } from "@/lib/services/diner/register";
import {
  REGISTER_LIMIT,
  REGISTER_WINDOW_MS,
  assertDurableRateLimit,
} from "@/lib/services/auth/login-protection";
import { getRequestIpFromRequest } from "@/lib/utils/request-ip";
import { handleApiError } from "@/lib/utils/errors";

export async function POST(request: Request) {
  try {
    const ip = getRequestIpFromRequest(request);
    await assertDurableRateLimit({
      kind: "register",
      ip,
      limit: REGISTER_LIMIT,
      windowMs: REGISTER_WINDOW_MS,
    });

    const body = await request.json();
    const diner = await registerDiner(body, { remoteIp: ip });
    return NextResponse.json({ data: diner }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
