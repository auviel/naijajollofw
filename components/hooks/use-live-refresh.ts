"use client";

import { useEffect } from "react";

export const ACTIVE_DELIVERY_POLL_MS = 10_000;

type LiveRefreshOptions = {
  enabled: boolean;
  intervalMs?: number;
  onRefresh: () => void | Promise<void>;
};

/** Poll on an interval and refresh when the tab becomes visible again. */
export function useLiveRefresh({
  enabled,
  intervalMs = ACTIVE_DELIVERY_POLL_MS,
  onRefresh,
}: LiveRefreshOptions) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const refresh = () => {
      void onRefresh();
    };

    const intervalId = window.setInterval(refresh, intervalMs);

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        refresh();
      }
    }

    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [enabled, intervalMs, onRefresh]);
}
