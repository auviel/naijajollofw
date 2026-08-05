import { mobileLogoutSchema } from "@/lib/domain/auth/mobile";
import { mobileLogout } from "@/lib/services/auth/mobile-auth";
import { parseJsonBody } from "@/lib/utils/api-request";
import { handleApiError } from "@/lib/utils/errors";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await parseJsonBody(request, mobileLogoutSchema);
    const data = await mobileLogout(body.refreshToken);
    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error);
  }
}
