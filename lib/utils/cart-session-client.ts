import { CART_SESSION_STORAGE_KEY } from "@/lib/domain/cart/types";

/** Persist guest cart sid to localStorage after cart API responses. */
export function rememberCartSessionId(sessionId: string | null | undefined) {
  if (typeof window === "undefined" || !sessionId) {
    return;
  }
  try {
    window.localStorage.setItem(CART_SESSION_STORAGE_KEY, sessionId);
  } catch {
    // Private mode / quota.
  }
}

export function readRememberedCartSessionId(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return window.localStorage.getItem(CART_SESSION_STORAGE_KEY);
  } catch {
    return null;
  }
}
