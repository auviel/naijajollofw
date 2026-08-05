"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  ACTIVE_DELIVERY_POLL_MS,
  useLiveRefresh,
} from "@/components/hooks/use-live-refresh";
import type { StaffOrderListItem } from "@/lib/domain/order/types";

type KitchenSnapshot = {
  items: StaffOrderListItem[];
  pendingCount: number;
  prepMinutes: number;
};

type StaffKitchenLiveValue = KitchenSnapshot & {
  seeded: boolean;
  hydrate: (snapshot: KitchenSnapshot) => void;
  refresh: () => Promise<void>;
};

type ListApiResponse = {
  data: {
    items: StaffOrderListItem[];
    pendingAcceptanceCount: number;
    prepMinutes?: number;
  };
};

const StaffKitchenLiveContext = createContext<StaffKitchenLiveValue | null>(
  null,
);

export function StaffKitchenLiveProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<KitchenSnapshot>({
    items: [],
    pendingCount: 0,
    prepMinutes: 15,
  });
  const [seeded, setSeeded] = useState(false);

  const hydrate = useCallback((next: KitchenSnapshot) => {
    setSnapshot(next);
    setSeeded(true);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(
        "/api/orders?filter=active&channel=kitchen&limit=80",
        { cache: "no-store" },
      );
      if (!response.ok) {
        return;
      }
      const body = (await response.json()) as ListApiResponse;
      setSnapshot({
        items: body.data.items,
        pendingCount: body.data.pendingAcceptanceCount,
        prepMinutes: body.data.prepMinutes ?? 15,
      });
      setSeeded(true);
    } catch {
      // Ignore transient poll errors.
    }
  }, []);

  useLiveRefresh({
    enabled: true,
    intervalMs: ACTIVE_DELIVERY_POLL_MS,
    onRefresh: refresh,
    refreshOnMount: true,
  });

  const value = useMemo<StaffKitchenLiveValue>(
    () => ({
      ...snapshot,
      seeded,
      hydrate,
      refresh,
    }),
    [snapshot, seeded, hydrate, refresh],
  );

  return (
    <StaffKitchenLiveContext.Provider value={value}>
      {children}
    </StaffKitchenLiveContext.Provider>
  );
}

export function useStaffKitchenLive(): StaffKitchenLiveValue {
  const value = useContext(StaffKitchenLiveContext);
  if (!value) {
    throw new Error("useStaffKitchenLive must be used within StaffKitchenLiveProvider");
  }
  return value;
}
