import { NextResponse } from "next/server";
import { requireDiner } from "@/lib/auth/session";
import { resendDinerEmailVerification } from "@/lib/services/diner/email-verification";
import { handleApiError } from "@/lib/utils/errors";

export async function POST() {
  try {
    const diner = await requireDiner();
    const result = await resendDinerEmailVerification(diner.id);
    return NextResponse.json({
      data: {
        ok: true,
        alreadyVerified: result.alreadyVerified,
        message: result.alreadyVerified
          ? "Your email is already verified."
          : "Verification email sent. Check your inbox.",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
