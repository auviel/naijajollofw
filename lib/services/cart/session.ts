import { cookies } from "next/headers";
import {
  CART_SESSION_COOKIE,
  CART_SESSION_MAX_AGE_SECONDS,
} from "@/lib/domain/cart/types";

const SESSION_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isCartSessionId(value: string): boolean {
  return SESSION_ID_RE.test(value.trim());
}

export async function setCartSessionCookie(sessionId: string): Promise<void> {
  const jar = await cookies();
  jar.set(CART_SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: CART_SESSION_MAX_AGE_SECONDS,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function readCartSessionId(): Promise<string | null> {
  const jar = await cookies();
  const value = jar.get(CART_SESSION_COOKIE)?.value?.trim();
  return value && isCartSessionId(value) ? value : null;
}

/**
 * Re-issue the cart cookie with a fresh max-age. Safari ITP can drop
 * long-lived cookies after ~7 days without interaction; sliding refresh
 * on every cart touch keeps active shoppers covered.
 */
export async function touchCartSessionCookie(
  sessionId: string,
): Promise<void> {
  if (!isCartSessionId(sessionId)) {
    return;
  }
  await setCartSessionCookie(sessionId);
}

export async function getOrCreateCartSessionId(): Promise<{
  sessionId: string;
  created: boolean;
}> {
  const existing = await readCartSessionId();
  if (existing) {
    await touchCartSessionCookie(existing);
    return { sessionId: existing, created: false };
  }

  const sessionId = crypto.randomUUID();
  await setCartSessionCookie(sessionId);
  return { sessionId, created: true };
}

/** Restore a guest cart cookie from a client-side backup (localStorage). */
export async function restoreCartSessionId(
  sessionId: string,
): Promise<string | null> {
  const trimmed = sessionId.trim();
  if (!isCartSessionId(trimmed)) {
    return null;
  }
  await setCartSessionCookie(trimmed);
  return trimmed;
}
