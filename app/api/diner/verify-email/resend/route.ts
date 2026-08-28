import { NextResponse } from "next/server";
import { requireDiner } from "@/lib/auth/session";
import { resendDinerEmailVerification } from "@/lib/services/diner/email-verification";
import { AppError } from "@/lib/utils/errors";
import { handleApiError } from "@/lib/utils/errors";

export async function POST() {
  try {
    const diner = await requireDiner();
    const result = await resendDinerEmailVerification(diner.id);
    if (!result.ok) {
      throw new AppError("PROVIDER_ERROR", result.error, 503);
    }
    return NextResponse.json({
      data: {
        ok: true,
        alreadyVerified: result.alreadyVerified,
        message: result.alreadyVerified
          ? "Your email is already verified."
          : result.throttled
            ? "Please wait a minute before requesting another email."
            : "Verification email sent. Check your inbox.",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
