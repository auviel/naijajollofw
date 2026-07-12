import { NextResponse } from "next/server";
import { resetDinerPassword } from "@/lib/services/diner/password-reset";
import { handleApiError } from "@/lib/utils/errors";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    await resetDinerPassword(body);
    return NextResponse.json({
      data: { ok: true, message: "Password updated. You can sign in now." },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
