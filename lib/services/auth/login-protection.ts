import {
  authChallengeRepository,
  hashAuthChallengeKey,
} from "@/lib/db/repositories/auth-challenge.repository";
import { AppError } from "@/lib/utils/errors";

export const LOGIN_FAILURE_WINDOW_MS = 15 * 60 * 1000;
export const LOGIN_TURNSTILE_AFTER_FAILURES = 3;
export const LOGIN_IP_MAX_ATTEMPTS = 30;
export const FORGOT_PASSWORD_LIMIT = 5;
export const FORGOT_PASSWORD_WINDOW_MS = 60 * 60 * 1000;
export const REGISTER_LIMIT = 10;
export const REGISTER_WINDOW_MS = 60 * 60 * 1000;
export const CHECKOUT_LIMIT = 20;
export const CHECKOUT_WINDOW_MS = 60_000;
export const CART_ADD_LIMIT = 60;
export const CART_ADD_WINDOW_MS = 60_000;
export const MOBILE_LOGIN_LIMIT = 20;
export const MOBILE_LOGIN_WINDOW_MS = 15 * 60 * 1000;
export const STAFF_PASSWORD_OTP_LIMIT = 5;
export const STAFF_PASSWORD_OTP_WINDOW_MS = 60_000;
export const STAFF_PASSWORD_CONFIRM_LIMIT = 10;
export const STAFF_PASSWORD_CONFIRM_WINDOW_MS = 60_000;
export const STAFF_EMAIL_CONFIRM_LIMIT = 10;
export const STAFF_EMAIL_CONFIRM_WINDOW_MS = 60_000;
export const STAFF_ME_PATCH_LIMIT = 20;
export const STAFF_ME_PATCH_WINDOW_MS = 60_000;
export const DELIVERY_QUOTE_LIMIT = 20;
export const DELIVERY_QUOTE_WINDOW_MS = 60_000;
export const DELIVERY_CREATE_LIMIT = 10;
export const DELIVERY_CREATE_WINDOW_MS = 60_000;
export const STORE_UPDATE_LIMIT = 10;
export const STORE_UPDATE_WINDOW_MS = 60_000;
export const CUSTOMER_CREATE_LIMIT = 20;
export const CUSTOMER_CREATE_WINDOW_MS = 60_000;
export const ORDER_FULFILL_LIMIT = 20;
export const ORDER_FULFILL_WINDOW_MS = 60_000;

function loginPairKey(email: string, ip: string): string {
  return hashAuthChallengeKey([
    "login",
    email.trim().toLowerCase(),
    ip.trim() || "unknown",
  ]);
}

function loginIpKey(ip: string): string {
  return hashAuthChallengeKey(["loginip", ip.trim() || "unknown"]);
}

function rateKey(kind: string, ip: string): string {
  return hashAuthChallengeKey([kind, ip.trim() || "unknown"]);
}

async function readWindow(
  key: string,
  windowMs: number,
): Promise<{ failCount: number; windowStartedAt: Date; fresh: boolean }> {
  const now = Date.now();
  const row = await authChallengeRepository.findByKey(key);
  if (!row || now - row.windowStartedAt.getTime() >= windowMs) {
    return {
      failCount: 0,
      windowStartedAt: new Date(now),
      fresh: true,
    };
  }
  return {
    failCount: row.failCount,
    windowStartedAt: row.windowStartedAt,
    fresh: false,
  };
}

export type LoginChallengeState = {
  failures: number;
  requiresTurnstile: boolean;
  ipBlocked: boolean;
};

export async function getLoginChallengeState(
  email: string,
  ip: string,
): Promise<LoginChallengeState> {
  const [pair, ipWindow] = await Promise.all([
    readWindow(loginPairKey(email, ip), LOGIN_FAILURE_WINDOW_MS),
    readWindow(loginIpKey(ip), LOGIN_FAILURE_WINDOW_MS),
  ]);

  return {
    failures: pair.failCount,
    requiresTurnstile: pair.failCount >= LOGIN_TURNSTILE_AFTER_FAILURES,
    ipBlocked: ipWindow.failCount >= LOGIN_IP_MAX_ATTEMPTS,
  };
}

export async function recordLoginFailure(
  email: string,
  ip: string,
): Promise<LoginChallengeState> {
  const now = new Date();
  const pairKey = loginPairKey(email, ip);
  const ipOnlyKey = loginIpKey(ip);

  const [pair, ipWindow] = await Promise.all([
    readWindow(pairKey, LOGIN_FAILURE_WINDOW_MS),
    readWindow(ipOnlyKey, LOGIN_FAILURE_WINDOW_MS),
  ]);

  const nextPairCount = pair.fresh ? 1 : pair.failCount + 1;
  const nextIpCount = ipWindow.fresh ? 1 : ipWindow.failCount + 1;

  await Promise.all([
    authChallengeRepository.upsertWindow({
      key: pairKey,
      failCount: nextPairCount,
      windowStartedAt: pair.fresh ? now : pair.windowStartedAt,
    }),
    authChallengeRepository.upsertWindow({
      key: ipOnlyKey,
      failCount: nextIpCount,
      windowStartedAt: ipWindow.fresh ? now : ipWindow.windowStartedAt,
    }),
  ]);

  return {
    failures: nextPairCount,
    requiresTurnstile: nextPairCount >= LOGIN_TURNSTILE_AFTER_FAILURES,
    ipBlocked: nextIpCount >= LOGIN_IP_MAX_ATTEMPTS,
  };
}

export async function clearLoginFailures(
  email: string,
  ip: string,
): Promise<void> {
  await Promise.all([
    authChallengeRepository.deleteByKey(loginPairKey(email, ip)),
    // Keep IP counter (anti-stuffing across emails); only clear pair on success.
  ]);
}

/**
 * Fixed-window durable rate limit. Throws AppError 429 when exceeded.
 * Prefer `subject` (e.g. userId) for authenticated routes; falls back to IP.
 */
export async function assertDurableRateLimit(input: {
  kind:
    | "forgot"
    | "register"
    | "login-challenge"
    | "checkout"
    | "cart-add"
    | "mobile-login"
    | "staff-password-otp"
    | "staff-password-confirm"
    | "staff-email-confirm"
    | "staff-me-patch"
    | "delivery-quote"
    | "delivery-create"
    | "store-update"
    | "customer-create"
    | "order-fulfill";
  ip: string;
  /** Authenticated subject (user id). When set, buckets by subject instead of IP. */
  subject?: string;
  limit: number;
  windowMs: number;
}): Promise<void> {
  const key = rateKey(input.kind, input.subject?.trim() || input.ip);
  const window = await readWindow(key, input.windowMs);
  const nextCount = window.fresh ? 1 : window.failCount + 1;

  if (!window.fresh && window.failCount >= input.limit) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil(
        (window.windowStartedAt.getTime() + input.windowMs - Date.now()) /
          1000,
      ),
    );
    throw new AppError(
      "VALIDATION_ERROR",
      "Too many attempts. Try again shortly.",
      429,
      { retryAfterSeconds },
    );
  }

  await authChallengeRepository.upsertWindow({
    key,
    failCount: nextCount,
    windowStartedAt: window.fresh ? new Date() : window.windowStartedAt,
  });
}
