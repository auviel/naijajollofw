"use client";

import { useCallback, useState } from "react";
import { DeliveryList } from "@/components/features/deliveries/delivery-list";
import { ACTIVE_DELIVERY_POLL_MS, useLiveRefresh } from "@/components/hooks/use-live-refresh";
import { shouldPollDeliveries } from "@/lib/domain/delivery/filters";
import { reviveDeliveryListItems } from "@/lib/domain/delivery/revive-dates";
import type { DeliveryListFilter } from "@/lib/domain/delivery/filters";
import type { DeliveryListItem } from "@/lib/domain/delivery/types";

type DeliveryListLiveProps = {
  initialItems: DeliveryListItem[];
  filter: DeliveryListFilter;
  search: string;
};

type ListApiResponse = {
  data: {
    items: DeliveryListItem[];
  };
};

export function DeliveryListLive({
  initialItems,
  filter,
  search,
}: DeliveryListLiveProps) {
  const [items, setItems] = useState(initialItems);
  const [prevInitialItems, setPrevInitialItems] = useState(initialItems);

  if (initialItems !== prevInitialItems) {
    setPrevInitialItems(initialItems);
    setItems(initialItems);
  }

  const refresh = useCallback(async () => {
    const params = new URLSearchParams();
    if (filter !== "all") {
      params.set("filter", filter);
    }
    if (search) {
      params.set("q", search);
    }

    try {
      const response = await fetch(`/api/deliveries?${params.toString()}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        return;
      }

      const body = (await response.json()) as ListApiResponse;
      setItems(reviveDeliveryListItems(body.data.items));
    } catch {
      // Ignore transient network errors between polls.
    }
  }, [filter, search]);

  useLiveRefresh({
    enabled: shouldPollDeliveries(filter),
    intervalMs: ACTIVE_DELIVERY_POLL_MS,
    onRefresh: refresh,
  });

  return <DeliveryList items={items} />;
}
