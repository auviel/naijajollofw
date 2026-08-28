import { CART_SESSION_HEADER } from "@/lib/domain/cart/types";
import {
  readRememberedCartSessionId,
  rememberCartSessionId,
} from "@/lib/utils/cart-session-client";
import { DefaultChatTransport } from "ai";

/**
 * Web storefront chat transport — attaches x-cart-sid so tool cart
 * mutations hit the same guest cart as /api/cart (not a throwaway session).
 */
async function storefrontChatFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const headers = new Headers(init?.headers);
  const cartSid = readRememberedCartSessionId();
  if (cartSid) {
    headers.set(CART_SESSION_HEADER, cartSid);
  }
  return fetch(input, { ...init, headers, credentials: "same-origin" });
}

export function createStorefrontChatTransport() {
  return new DefaultChatTransport({
    api: "/api/ai/chat",
    fetch: storefrontChatFetch,
  });
}

/** Ensure localStorage + HttpOnly cookie share one cart sid before chat tools run. */
export async function ensureStorefrontCartSession(): Promise<string | null> {
  try {
    const backup = readRememberedCartSessionId();
    const response = await fetch("/api/cart/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ sessionId: backup ?? undefined }),
    });
    if (!response.ok) return backup;
    const body = (await response.json()) as {
      data?: { sessionId?: string | null };
    };
    const sessionId = body.data?.sessionId ?? null;
    rememberCartSessionId(sessionId);
    return sessionId ?? backup;
  } catch {
    return readRememberedCartSessionId();
  }
}
