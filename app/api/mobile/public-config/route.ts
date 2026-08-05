import { NextResponse } from "next/server";
import {
  getTurnstileSiteKey,
  isTurnstileEnabled,
} from "@/lib/integrations/turnstile/config";

export async function GET() {
  return NextResponse.json({
    data: {
      turnstileSiteKey: getTurnstileSiteKey(),
      turnstileEnabled: isTurnstileEnabled(),
    },
  });
}
