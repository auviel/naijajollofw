import {
  getTurnstileSecretKey,
  isTurnstileEnabled,
} from "@/lib/integrations/turnstile/config";
import { AppError } from "@/lib/utils/errors";
import { logger } from "@/lib/utils/logger";

type SiteverifyResponse = {
  success: boolean;
  "error-codes"?: string[];
  action?: string;
  cdata?: string;
};

/**
 * Validates a Turnstile token with Cloudflare Siteverify.
 * No-ops only when Turnstile is not configured (local without keys).
 */
export async function verifyTurnstileToken(
  token: string | undefined,
  remoteIp?: string | null,
): Promise<void> {
  if (!isTurnstileEnabled()) {
    if (process.env.NODE_ENV === "production") {
      logger.error("turnstile.misconfigured", {
        hasSiteKey: Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY),
        hasSecret: Boolean(process.env.TURNSTILE_SECRET_KEY),
      });
      throw new AppError(
        "INTERNAL_ERROR",
        "Account creation is temporarily unavailable.",
        503,
      );
    }
    logger.warn("turnstile.skipped_not_configured");
    return;
  }

  const trimmed = token?.trim();
  if (!trimmed) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Complete the security check and try again.",
      400,
    );
  }

  const secret = getTurnstileSecretKey();
  if (!secret) {
    throw new AppError(
      "INTERNAL_ERROR",
      "Account creation is temporarily unavailable.",
      503,
    );
  }

  const body = new URLSearchParams();
  body.set("secret", secret);
  body.set("response", trimmed);
  if (remoteIp) {
    body.set("remoteip", remoteIp);
  }

  let result: SiteverifyResponse;
  try {
    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      },
    );
    result = (await response.json()) as SiteverifyResponse;
  } catch (error) {
    logger.error("turnstile.siteverify_failed", { error });
    throw new AppError(
      "INTERNAL_ERROR",
      "Could not verify the security check. Try again.",
      502,
    );
  }

  if (!result.success) {
    logger.info("turnstile.rejected", {
      errorCodes: result["error-codes"] ?? [],
    });
    throw new AppError(
      "FORBIDDEN",
      "Security check failed. Refresh and try again.",
      403,
    );
  }
}
