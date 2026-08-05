import { mobileRefreshSchema } from "@/lib/domain/auth/mobile";
import { mobileRefresh } from "@/lib/services/auth/mobile-auth";
import { parseJsonBody } from "@/lib/utils/api-request";
import { handleApiError } from "@/lib/utils/errors";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await parseJsonBody(request, mobileRefreshSchema);
    const data = await mobileRefresh(body.refreshToken);
    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error);
  }
}
