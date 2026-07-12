import { NextResponse } from "next/server";
import { getTurnstileSiteKey } from "@/lib/integrations/turnstile/config";
import {
  LOGIN_FAILURE_WINDOW_MS,
  assertDurableRateLimit,
  getLoginChallengeState,
} from "@/lib/services/auth/login-protection";
import { getRequestIpFromRequest } from "@/lib/utils/request-ip";
import { handleApiError } from "@/lib/utils/errors";
import { z } from "zod";

const bodySchema = z.object({
  email: z.string().trim().email().max(120),
});

export async function POST(request: Request) {
  try {
    const ip = getRequestIpFromRequest(request);
    await assertDurableRateLimit({
      kind: "login-challenge",
      ip,
      limit: 60,
      windowMs: LOGIN_FAILURE_WINDOW_MS,
    });

    const json = await request.json();
    const parsed = bodySchema.parse(json);
    const state = await getLoginChallengeState(parsed.email, ip);

    return NextResponse.json({
      data: {
        requiresTurnstile: state.requiresTurnstile || state.ipBlocked,
        ipBlocked: state.ipBlocked,
        failures: state.failures,
        turnstileSiteKey: getTurnstileSiteKey(),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
