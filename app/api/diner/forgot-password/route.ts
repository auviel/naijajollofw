import { NextResponse } from "next/server";
import { requestDinerPasswordReset } from "@/lib/services/diner/password-reset";
import { handleApiError } from "@/lib/utils/errors";

export async function POST(request: Request) {
  try {
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
