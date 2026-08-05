"use client";

import { useEffect } from "react";

export const ACTIVE_DELIVERY_POLL_MS = 10_000;

type LiveRefreshOptions = {
  enabled: boolean;
  intervalMs?: number;
  onRefresh: () => void | Promise<void>;
  /** Fire once when the effect mounts (deferred so setState is not sync-in-effect). */
  refreshOnMount?: boolean;
};

/** Poll on an interval while the tab is visible; refresh when it becomes visible again. */
export function useLiveRefresh({
  enabled,
  intervalMs = ACTIVE_DELIVERY_POLL_MS,
  onRefresh,
  refreshOnMount = false,
}: LiveRefreshOptions) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const refresh = () => {
      void onRefresh();
    };

    let intervalId: number | undefined;
    let mountTimeoutId: number | undefined;

    function startInterval() {
      if (intervalId !== undefined) {
        return;
      }
      intervalId = window.setInterval(refresh, intervalMs);
    }

    function stopInterval() {
      if (intervalId === undefined) {
        return;
      }
      window.clearInterval(intervalId);
      intervalId = undefined;
    }

    if (refreshOnMount) {
      mountTimeoutId = window.setTimeout(refresh, 0);
    }

    if (document.visibilityState === "visible") {
      startInterval();
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        refresh();
        startInterval();
        return;
      }
      stopInterval();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (mountTimeoutId !== undefined) {
        window.clearTimeout(mountTimeoutId);
      }
      stopInterval();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [enabled, intervalMs, onRefresh, refreshOnMount]);
}
