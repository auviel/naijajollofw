import type { MobileApp } from "@/lib/domain/auth/types";
import {
  MOBILE_ACCESS_TTL_SECONDS,
  MOBILE_REFRESH_TTL_MS,
  createRefreshTokenValue,
  hashRefreshToken,
  signMobileAccessToken,
} from "@/lib/auth/mobile-token";
import { verifyUserCredentials } from "@/lib/auth/verify-credentials";
import { refreshTokenRepository } from "@/lib/db/repositories/refresh-token.repository";
import { storeRepository } from "@/lib/db/repositories/store.repository";
import {
  MOBILE_LOGIN_LIMIT,
  MOBILE_LOGIN_WINDOW_MS,
  assertDurableRateLimit,
  clearLoginFailures,
  getLoginChallengeState,
  recordLoginFailure,
} from "@/lib/services/auth/login-protection";
import { AppError } from "@/lib/utils/errors";
import { getRequestIp } from "@/lib/utils/request-ip";

function roleForApp(app: MobileApp) {
  return app === "staff" ? "STORE_MANAGER" : "DINER";
}

async function issueTokenPair(input: {
  userId: string;
  email: string;
  name: string;
  storeId: string;
  storeName: string;
  role: "STORE_MANAGER" | "DINER";
  phoneE164: string | null;
  sessionVersion: number;
  app: MobileApp;
}) {
  const accessToken = signMobileAccessToken({
    sub: input.userId,
    email: input.email,
    name: input.name,
    storeId: input.storeId,
    storeName: input.storeName,
    role: input.role,
    phoneE164: input.phoneE164,
    sessionVersion: input.sessionVersion,
    app: input.app,
  });
  const refreshToken = createRefreshTokenValue();
  await refreshTokenRepository.create({
    userId: input.userId,
    tokenHash: hashRefreshToken(refreshToken),
    app: input.app,
    sessionVersion: input.sessionVersion,
    expiresAt: new Date(Date.now() + MOBILE_REFRESH_TTL_MS),
  });

  return {
    accessToken,
    refreshToken,
    expiresIn: MOBILE_ACCESS_TTL_SECONDS,
    tokenType: "Bearer" as const,
  };
}

export async function mobileLogin(input: {
  email: string;
  password: string;
  app: MobileApp;
}) {
  const ip = await getRequestIp();
  await assertDurableRateLimit({
    kind: "mobile-login",
    ip,
    limit: MOBILE_LOGIN_LIMIT,
    windowMs: MOBILE_LOGIN_WINDOW_MS,
  });

  const email = input.email.trim().toLowerCase();
  const challenge = await getLoginChallengeState(email, ip);
  if (challenge.ipBlocked) {
    throw new AppError("UNAUTHORIZED", "Too many login attempts. Try again later.", 401);
  }

  const user = await verifyUserCredentials(email, input.password);
  if (!user) {
    await recordLoginFailure(email, ip);
    throw new AppError("UNAUTHORIZED", "Invalid email or password.", 401);
  }

  if (user.role !== roleForApp(input.app)) {
    await recordLoginFailure(email, ip);
    throw new AppError(
      "FORBIDDEN",
      input.app === "staff"
        ? "Staff account required."
        : "Diner account required.",
      403,
    );
  }

  await clearLoginFailures(email, ip);

  const tokens = await issueTokenPair({
    userId: user.id,
    email: user.email,
    name: user.name,
    storeId: user.storeId,
    storeName: user.storeName,
    role: user.role,
    phoneE164: user.phoneE164,
    sessionVersion: user.sessionVersion,
    app: input.app,
  });

  const store =
    input.app === "staff"
      ? await storeRepository.getProfileById(user.storeId)
      : null;

  return {
    ...tokens,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      storeId: user.storeId,
      storeName: user.storeName,
      phoneE164: user.phoneE164,
    },
    store,
  };
}

export async function mobileRefresh(refreshToken: string) {
  const tokenHash = hashRefreshToken(refreshToken);
  const existing = await refreshTokenRepository.findActiveByHash(tokenHash);
  if (!existing) {
    throw new AppError("UNAUTHORIZED", "Invalid or expired refresh token.", 401);
  }

  const user = existing.user;
  if (user.sessionVersion !== existing.sessionVersion) {
    await refreshTokenRepository.revokeByHash(tokenHash);
    throw new AppError("UNAUTHORIZED", "Session expired. Sign in again.", 401);
  }

  await refreshTokenRepository.revokeByHash(tokenHash);

  return issueTokenPair({
    userId: user.id,
    email: user.email,
    name: user.name,
    storeId: user.storeId,
    storeName: user.store?.name ?? "Store",
    role: user.role,
    phoneE164: user.phoneE164 ?? null,
    sessionVersion: user.sessionVersion,
    app: existing.app,
  });
}

export async function mobileLogout(refreshToken?: string | null) {
  if (!refreshToken) {
    return { ok: true as const };
  }
  await refreshTokenRepository.revokeByHash(hashRefreshToken(refreshToken));
  return { ok: true as const };
}
