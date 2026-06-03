"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

type DeliveryDetailRefreshProps = {
  enabled: boolean;
  intervalMs?: number;
};

export function DeliveryDetailRefresh({
  enabled,
  intervalMs = 30_000,
}: DeliveryDetailRefreshProps) {
  const router = useRouter();

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const interval = window.setInterval(() => {
      router.refresh();
    }, intervalMs);

    return () => window.clearInterval(interval);
  }, [enabled, intervalMs, router]);

  return null;
}
