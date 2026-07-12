"use client";

import { useCallback, useState } from "react";
import { DeliveryDetailView } from "@/components/features/deliveries/delivery-detail-view";
import { ACTIVE_DELIVERY_POLL_MS, useLiveRefresh } from "@/components/hooks/use-live-refresh";
import { reviveDeliveryDetail } from "@/lib/domain/delivery/revive-dates";
import { shouldRefreshDeliveryDetail } from "@/lib/domain/delivery/timeline";
import type { DeliveryDetail } from "@/lib/domain/delivery/types";

type DeliveryDetailLiveProps = {
  initialDelivery: DeliveryDetail;
};

type DetailApiResponse = {
  data: DeliveryDetail;
};

export function DeliveryDetailLive({ initialDelivery }: DeliveryDetailLiveProps) {
  const [delivery, setDelivery] = useState(initialDelivery);
  const [prevInitialDelivery, setPrevInitialDelivery] = useState(initialDelivery);

  if (initialDelivery !== prevInitialDelivery) {
    setPrevInitialDelivery(initialDelivery);
    setDelivery(initialDelivery);
  }

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`/api/deliveries/${delivery.id}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        return;
      }

      const body = (await response.json()) as DetailApiResponse;
      setDelivery(reviveDeliveryDetail(body.data));
    } catch {
      // Ignore transient network errors between polls.
    }
  }, [delivery.id]);

  useLiveRefresh({
    enabled: shouldRefreshDeliveryDetail(delivery.status),
    intervalMs: ACTIVE_DELIVERY_POLL_MS,
    onRefresh: refresh,
  });

  return <DeliveryDetailView delivery={delivery} />;
}
