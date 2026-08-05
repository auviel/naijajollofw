import { mobileLoginSchema } from "@/lib/domain/auth/mobile";
import { mobileLogin } from "@/lib/services/auth/mobile-auth";
import { parseJsonBody } from "@/lib/utils/api-request";
import { handleApiError } from "@/lib/utils/errors";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await parseJsonBody(request, mobileLoginSchema);
    const data = await mobileLogin(body);
    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error);
  }
}
