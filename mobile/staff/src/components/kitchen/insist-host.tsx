import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { InsistOverlay } from "@/components/kitchen/insist-overlay";
import {
  ackInsistOrder,
  getInsistAckedIds,
  pruneInsistAcks,
} from "@/lib/kitchen/insist-ack";
import {
  insistBumpConfirm,
  insistError,
  startInsistAlertLoop,
  stopInsistAlertLoop,
} from "@/lib/kitchen/insist";
import {
  isKitchenBoardDeferred,
  type ListStaffOrdersResult,
  type StaffOrderListItem,
} from "@naijajollof/api-types";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  AppState,
  type AppStateStatus,
} from "react-native";

const POLL_MS = 10_000;

function orderTimeMs(order: StaffOrderListItem): number {
  const iso = order.placedAt ?? order.createdAt;
  const ms = new Date(iso).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

function eligibleNewOrders(
  items: StaffOrderListItem[],
  prepMinutes: number,
): StaffOrderListItem[] {
  return items
    .filter(
      (order) =>
        order.status === "pending_acceptance" &&
        !isKitchenBoardDeferred(order, prepMinutes),
    )
    .sort((a, b) => orderTimeMs(b) - orderTimeMs(a));
}

export function InsistHost({ paused = false }: { paused?: boolean }) {
  const { user } = useAuth();
  const [items, setItems] = useState<StaffOrderListItem[]>([]);
  const [prepMinutes, setPrepMinutes] = useState(15);
  const [acked, setAcked] = useState<Set<string>>(new Set());
  const [bumpBusy, setBumpBusy] = useState(false);
  const [appActive, setAppActive] = useState(
    AppState.currentState === "active",
  );

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const result = await apiFetch<ListStaffOrdersResult>(
        "/api/orders?filter=active&channel=kitchen&limit=80",
      );
      setItems(result.items);
      setPrepMinutes(result.prepMinutes ?? 15);
      const pendingIds = result.items
        .filter((order) => order.status === "pending_acceptance")
        .map((order) => order.id);
      await pruneInsistAcks(pendingIds);
      setAcked(await getInsistAckedIds());
    } catch {
      // Board owns error UI; insist stays quiet on poll failure.
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setItems([]);
      stopInsistAlertLoop();
      return;
    }
    void load();
    let id: ReturnType<typeof setInterval> | null = setInterval(
      () => void load(),
      POLL_MS,
    );

    function onAppState(state: AppStateStatus) {
      setAppActive(state === "active");
      if (state === "active") {
        void load();
        if (!id) id = setInterval(() => void load(), POLL_MS);
        return;
      }
      if (id) {
        clearInterval(id);
        id = null;
      }
      stopInsistAlertLoop();
    }

    const sub = AppState.addEventListener("change", onAppState);
    return () => {
      if (id) clearInterval(id);
      sub.remove();
      stopInsistAlertLoop();
    };
  }, [user, load]);

  const queue = useMemo(() => {
    const eligible = eligibleNewOrders(items, prepMinutes);
    return eligible.filter((order) => !acked.has(order.id));
  }, [items, prepMinutes, acked]);

  const current = !paused && appActive && user ? (queue[0] ?? null) : null;
  const moreWaiting = current ? Math.max(0, queue.length - 1) : 0;

  useEffect(() => {
    if (current) {
      startInsistAlertLoop();
      return;
    }
    stopInsistAlertLoop();
  }, [current?.id]);

  const onAccept = useCallback(async () => {
    if (!current) return;
    await ackInsistOrder(current.id);
    setAcked(await getInsistAckedIds());
  }, [current]);

  const onBump = useCallback(async () => {
    if (!current || bumpBusy) return;
    setBumpBusy(true);
    void insistBumpConfirm();
    try {
      await apiFetch(`/api/orders/${current.id}/transition`, {
        method: "POST",
        body: JSON.stringify({ to: "preparing" }),
      });
      await load();
    } catch (err) {
      void insistError();
      const message = err instanceof Error ? err.message : "Bump failed";
      Alert.alert("Bump failed", message, [
        { text: "Dismiss", style: "cancel" },
        {
          text: "Retry",
          onPress: () => void onBump(),
        },
      ]);
    } finally {
      setBumpBusy(false);
    }
  }, [current, bumpBusy, load]);

  if (!current) return null;

  return (
    <InsistOverlay
      order={current}
      moreWaiting={moreWaiting}
      bumpBusy={bumpBusy}
      onAccept={() => void onAccept()}
      onBump={() => void onBump()}
    />
  );
}
