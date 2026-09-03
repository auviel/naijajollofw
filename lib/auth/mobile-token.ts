import { createHmac, createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { UserRole } from "@/lib/domain/auth/types";
import type { MobileApp } from "@/lib/domain/auth/types";

export const MOBILE_ACCESS_TTL_SECONDS = 15 * 60;
export const MOBILE_REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const MOBILE_ACCESS_TYP = "mobile_access";

export type MobileAccessClaims = {
  sub: string;
  email: string;
  name: string;
  storeId: string;
  storeName: string;
  role: UserRole;
  phoneE164: string | null;
  sessionVersion: number;
  app: MobileApp;
  typ: typeof MOBILE_ACCESS_TYP;
  iat: number;
  exp: number;
};

function authSecret(): string {
  const secret = process.env.AUTH_SECRET?.trim();
  if (!secret) {
    throw new Error("AUTH_SECRET is required for mobile tokens");
  }
  return secret;
}

function base64urlJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

export function signMobileAccessToken(
  claims: Omit<MobileAccessClaims, "iat" | "exp" | "typ">,
  ttlSeconds = MOBILE_ACCESS_TTL_SECONDS,
): string {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload: MobileAccessClaims = {
    ...claims,
    typ: MOBILE_ACCESS_TYP,
    iat: now,
    exp: now + ttlSeconds,
  };
  const encodedHeader = base64urlJson(header);
  const encodedPayload = base64urlJson(payload);
  const data = `${encodedHeader}.${encodedPayload}`;
  const sig = createHmac("sha256", authSecret()).update(data).digest("base64url");
  return `${data}.${sig}`;
}

export function verifyMobileAccessToken(token: string): MobileAccessClaims | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      return null;
    }
    const [encodedHeader, encodedPayload, signature] = parts;
    const data = `${encodedHeader}.${encodedPayload}`;
    const expected = createHmac("sha256", authSecret())
      .update(data)
      .digest("base64url");
    const sigBuf = Buffer.from(signature, "utf8");
    const expectedBuf = Buffer.from(expected, "utf8");
    if (
      sigBuf.length !== expectedBuf.length ||
      !timingSafeEqual(sigBuf, expectedBuf)
    ) {
      return null;
    }

    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as MobileAccessClaims;
    if (payload.typ !== MOBILE_ACCESS_TYP || !payload.sub) {
      return null;
    }
    if (typeof payload.exp !== "number" || payload.exp * 1000 <= Date.now()) {
      return null;
    }
    return payload;
  } catch {
    // Corrupt token, missing AUTH_SECRET mid-reload, etc. — never 500 the route.
    return null;
  }
}

export function createRefreshTokenValue(): string {
  return randomBytes(32).toString("base64url");
}

export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function readBearerToken(authorization: string | null): string | null {
  if (!authorization) {
    return null;
  }
  const match = /^Bearer\s+(\S+)/i.exec(authorization.trim());
  return match?.[1] ?? null;
}
