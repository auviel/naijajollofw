import { createHash } from "node:crypto";
import { AppError } from "@/lib/utils/errors";
import { logger } from "@/lib/utils/logger";

/**
 * Have I Been Pwned k-anonymity range API.
 * Only the first 5 hex chars of the SHA-1 hash leave this server.
 */
export async function assertPasswordNotPwned(password: string): Promise<void> {
  const sha1 = createHash("sha1").update(password, "utf8").digest("hex").toUpperCase();
  const prefix = sha1.slice(0, 5);
  const suffix = sha1.slice(5);

  let body: string;
  try {
    const response = await fetch(
      `https://api.pwnedpasswords.com/range/${prefix}`,
      {
        headers: {
          "Add-Padding": "true",
          "User-Agent": "NaijaJollof-deliverGO",
        },
        next: { revalidate: 0 },
      },
    );
    if (!response.ok) {
      logger.warn("hibp.range_unavailable", { status: response.status });
      // Fail open if HIBP is down — don't block signup/reset.
      return;
    }
    body = await response.text();
  } catch (error) {
    logger.warn("hibp.range_failed", { error });
    return;
  }

  const hit = body.split(/\r?\n/).some((line) => {
    const [hashSuffix] = line.split(":");
    return hashSuffix?.toUpperCase() === suffix;
  });

  if (hit) {
    throw new AppError(
      "VALIDATION_ERROR",
      "This password appears in known data breaches. Choose a different one.",
      400,
    );
  }
}
