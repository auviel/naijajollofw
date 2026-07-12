"use client";

import { useEffect } from "react";
import { CART_SESSION_STORAGE_KEY } from "@/lib/domain/cart/types";

function readBackup(): string | null {
  try {
    return window.localStorage.getItem(CART_SESSION_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeBackup(sessionId: string | null) {
  try {
    if (!sessionId) {
      window.localStorage.removeItem(CART_SESSION_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(CART_SESSION_STORAGE_KEY, sessionId);
  } catch {
    // Private mode / quota — ignore.
  }
}

/**
 * Keeps the guest cart cookie alive across Safari ITP by:
 * 1) Restoring from localStorage if the HttpOnly cookie was dropped
 * 2) Sliding-refreshing the cookie on load and when the tab becomes visible
 */
export function CartSessionPersistence() {
  useEffect(() => {
    let cancelled = false;

    async function sync() {
      try {
        const backup = readBackup();
        const response = await fetch("/api/cart/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: backup ?? undefined }),
        });
        if (!response.ok || cancelled) {
          return;
        }
        const body = (await response.json()) as {
          data?: { sessionId?: string | null };
        };
        const sessionId = body.data?.sessionId ?? null;
        if (sessionId) {
          writeBackup(sessionId);
        }
      } catch {
        // Offline / blocked — ignore.
      }
    }

    void sync();

    function onVisible() {
      if (document.visibilityState === "visible") {
        void sync();
      }
    }

    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return null;
}
