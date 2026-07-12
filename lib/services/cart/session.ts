import { cookies } from "next/headers";
import {
  CART_SESSION_COOKIE,
  CART_SESSION_MAX_AGE_SECONDS,
} from "@/lib/domain/cart/types";

export async function readCartSessionId(): Promise<string | null> {
  const jar = await cookies();
  const value = jar.get(CART_SESSION_COOKIE)?.value?.trim();
  return value && value.length >= 8 ? value : null;
}

export async function getOrCreateCartSessionId(): Promise<{
  sessionId: string;
  created: boolean;
}> {
  const existing = await readCartSessionId();
  if (existing) {
    return { sessionId: existing, created: false };
  }

  const sessionId = crypto.randomUUID();
  const jar = await cookies();
  jar.set(CART_SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: CART_SESSION_MAX_AGE_SECONDS,
    secure: process.env.NODE_ENV === "production",
  });

  return { sessionId, created: true };
}
