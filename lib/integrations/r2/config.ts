import { AppError } from "@/lib/utils/errors";

export type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  /** Public base URL (custom domain or r2.dev), no trailing slash. */
  publicBaseUrl: string;
  endpoint: string;
};

function trimEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}

/** True when all required R2 env vars are set for this environment's bucket. */
export function isR2Configured(): boolean {
  return Boolean(
    trimEnv("R2_ACCOUNT_ID") &&
      trimEnv("R2_ACCESS_KEY_ID") &&
      trimEnv("R2_SECRET_ACCESS_KEY") &&
      trimEnv("R2_BUCKET_NAME") &&
      trimEnv("R2_PUBLIC_BASE_URL"),
  );
}

/**
 * One bucket per environment via `R2_BUCKET_NAME` (e.g. `…-dev` / `…-prod`).
 * Do not put env segments in object keys.
 */
export function getR2Config(): R2Config {
  const accountId = trimEnv("R2_ACCOUNT_ID");
  const accessKeyId = trimEnv("R2_ACCESS_KEY_ID");
  const secretAccessKey = trimEnv("R2_SECRET_ACCESS_KEY");
  const bucketName = trimEnv("R2_BUCKET_NAME");
  const publicBaseUrl = trimEnv("R2_PUBLIC_BASE_URL")?.replace(/\/+$/, "");

  if (
    !accountId ||
    !accessKeyId ||
    !secretAccessKey ||
    !bucketName ||
    !publicBaseUrl
  ) {
    throw new AppError(
      "PROVIDER_ERROR",
      "R2 is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, and R2_PUBLIC_BASE_URL.",
      500,
    );
  }

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucketName,
    publicBaseUrl,
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  };
}
