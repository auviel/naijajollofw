import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  ColumnTabs,
  type BoardColumnId,
} from "@/components/kitchen/column-tabs";
import { TicketCard } from "@/components/kitchen/ticket-card";
import { OfflineBanner } from "@/components/kitchen/network-banners";
import {
  markBoardSeen,
  setBoardPendingAcceptance,
} from "@/lib/kitchen/board-attention";
import {
  getPersistedBoardColumn,
  setPersistedBoardColumn,
} from "@/lib/kitchen/board-column-state";
import { subscribeBoardRefresh } from "@/lib/kitchen/board-live";
import {
  isFulfillMethodBump,
  isReadyDeliveryBump,
  isStatusBump,
  primaryBumpFor,
} from "@/lib/kitchen/bump";
import { insistBumpConfirm, insistError } from "@/lib/kitchen/insist";
import {
  isKitchenBoardDeferred,
  KITCHEN_BOARD_COLUMNS,
  type ListStaffOrdersResult,
  type OrderStatus,
  type StaffOrderListItem,
} from "@naijajollof/api-types";
import { KitchenBoardSkeleton } from "@naijajollof/ui";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  AppState,
  type AppStateStatus,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { KitchenHeaderActions } from "@/components/kitchen/header-actions";
import { SafeScreen } from "@/components/kitchen/safe-screen";
import { DeliveryMethodSheet } from "@/components/kitchen/delivery-method-sheet";
import { KType } from "@/lib/kitchen/typography";
import { useThemedStyles } from "@/lib/kitchen/use-themed-styles";

const POLL_MS = 8_000;

/** Statuses that still belong on the live kitchen board. */
const BOARD_ACTIVE = new Set<string>([
  "pending_acceptance",
  "accepted",
  "preparing",
  "ready",
  "ready_for_pickup",
  "out_for_delivery",
]);

function patchBoardItems(
  items: StaffOrderListItem[],
  orderId: string,
  next: Partial<StaffOrderListItem> & { status: OrderStatus },
): StaffOrderListItem[] {
  if (!BOARD_ACTIVE.has(next.status)) {
    return items.filter((item) => item.id !== orderId);
  }
  return items.map((item) =>
    item.id === orderId ? { ...item, ...next } : item,
  );
}

function orderTimeMs(order: StaffOrderListItem): number {
  const iso = order.placedAt ?? order.createdAt;
  const ms = new Date(iso).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

function ordersForColumn(
  items: StaffOrderListItem[],
  columnId: BoardColumnId,
): StaffOrderListItem[] {
  const column = KITCHEN_BOARD_COLUMNS.find((c) => c.id === columnId);
  if (!column) return [];
  return items
    .filter((order) =>
      (column.statuses as readonly string[]).includes(order.status),
    )
    .sort((a, b) => orderTimeMs(b) - orderTimeMs(a));
}

function firstColumnWithWork(items: StaffOrderListItem[]): BoardColumnId {
  for (const column of KITCHEN_BOARD_COLUMNS) {
    // Prefer Cooking / Ready over All when auto-picking a lane.
    if (column.id === "all") continue;
    if (ordersForColumn(items, column.id).length > 0) {
      return column.id;
    }
  }
  return "cooking";
}

export function BoardScreen() {
  const router = useRouter();
  const { store } = useAuth();
  const styles = useThemedStyles((c) => ({
    content: { padding: 20, paddingBottom: 24, gap: 16 },
    topRow: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      alignItems: "center" as const,
      gap: 12,
    },
    error: { ...KType.metaStrong, color: c.danger },
    emptyBlock: { alignItems: "center" as const, gap: 8, marginTop: 24 },
    empty: {
      ...KType.meta,
      textAlign: "center" as const,
      paddingHorizontal: 12,
    },
    emptyColumn: {
      ...KType.meta,
      textAlign: "center" as const,
      paddingVertical: 12,
    },
    emptyCta: { ...KType.metaStrong, color: c.accent },
    list: { gap: 10 },
    later: { gap: 10, marginTop: 8 },
    laterHeader: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      alignItems: "center" as const,
    },
  }));
  const persisted = getPersistedBoardColumn();
  const [data, setData] = useState<ListStaffOrdersResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [methodOrder, setMethodOrder] = useState<{
    order: StaffOrderListItem;
    markReadyFirst: boolean;
  } | null>(null);
  const [activeColumnId, setActiveColumnId] = useState<BoardColumnId>(
    persisted.activeColumnId,
  );
  const [columnTouched, setColumnTouched] = useState(persisted.columnTouched);
  const [laterOpen, setLaterOpen] = useState(false);
  const loadSeq = useRef(0);

  const load = useCallback(async () => {
    const seq = ++loadSeq.current;
    try {
      const result = await apiFetch<ListStaffOrdersResult>(
        "/api/orders?filter=active&channel=kitchen&limit=80",
      );
      // Drop stale polls so an in-flight refresh can't revive a fulfilled ticket.
      if (seq !== loadSeq.current) return;
      setData(result);
      setBoardPendingAcceptance(result.pendingAcceptanceCount ?? 0);
      setError(null);
    } catch (err) {
      if (seq !== loadSeq.current) return;
      setError(err instanceof Error ? err.message : "Could not load board");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      markBoardSeen();
      void load();
    }, [load]),
  );

  useEffect(() => {
    return subscribeBoardRefresh(() => {
      void load();
    });
  }, [load]);

  useEffect(() => {
    setPersistedBoardColumn(activeColumnId, columnTouched);
  }, [activeColumnId, columnTouched]);

  useEffect(() => {
    void load();
    let id: ReturnType<typeof setInterval> | null = setInterval(
      () => void load(),
      POLL_MS,
    );

    function onAppState(state: AppStateStatus) {
      if (state === "active") {
        void load();
        if (!id) {
          id = setInterval(() => void load(), POLL_MS);
        }
        return;
      }
      if (id) {
        clearInterval(id);
        id = null;
      }
    }

    const sub = AppState.addEventListener("change", onAppState);
    return () => {
      if (id) clearInterval(id);
      sub.remove();
    };
  }, [load]);

  const prepMinutes = data?.prepMinutes ?? 15;
  const grouped = useMemo(() => {
    const live: StaffOrderListItem[] = [];
    const later: StaffOrderListItem[] = [];
    for (const item of data?.items ?? []) {
      if (isKitchenBoardDeferred(item, prepMinutes)) {
        later.push(item);
      } else {
        live.push(item);
      }
    }
    later.sort((a, b) => orderTimeMs(a) - orderTimeMs(b));
    return { live, later };
  }, [data?.items, prepMinutes]);

  useEffect(() => {
    if (columnTouched) return;
    setActiveColumnId(firstColumnWithWork(grouped.live));
  }, [grouped.live, columnTouched]);

  const columnCounts = useMemo(() => {
    return {
      cooking: ordersForColumn(grouped.live, "cooking").length,
      ready: ordersForColumn(grouped.live, "ready").length,
      all: ordersForColumn(grouped.live, "all").length,
    };
  }, [grouped.live]);

  const pendingOnBoard = useMemo(
    () =>
      grouped.live.some((order) => order.status === "pending_acceptance"),
    [grouped.live],
  );

  const activeOrders = ordersForColumn(grouped.live, activeColumnId);

  const selectColumn = useCallback((id: BoardColumnId) => {
    setColumnTouched(true);
    setActiveColumnId(id);
  }, []);

  const bumpOrder = useCallback(
    async (order: StaffOrderListItem) => {
      const bump = primaryBumpFor(order);
      if (!bump) return;

      if (isReadyDeliveryBump(bump)) {
        setMethodOrder({ order, markReadyFirst: true });
        return;
      }

      if (isFulfillMethodBump(bump)) {
        setMethodOrder({ order, markReadyFirst: false });
        return;
      }

      if (!isStatusBump(bump)) {
        return;
      }

      const previous = data;
      setBusyId(order.id);
      // Invalidate in-flight polls before optimistic patch.
      loadSeq.current += 1;
      setData((current) => {
        if (!current) return current;
        return {
          ...current,
          items: patchBoardItems(current.items, order.id, {
            status: bump.to as OrderStatus,
          }),
          pendingAcceptanceCount:
            order.status === "pending_acceptance"
              ? Math.max(0, current.pendingAcceptanceCount - 1)
              : current.pendingAcceptanceCount,
        };
      });
      void insistBumpConfirm();

      try {
        await apiFetch(`/api/orders/${order.id}/transition`, {
          method: "POST",
          body: JSON.stringify({ to: bump.to }),
        });
        // Bump already applied locally; refetch for counts/tabs (ignore stale races).
        await load();
      } catch (err) {
        setData(previous);
        void insistError();
        const message = err instanceof Error ? err.message : "Bump failed";
        setError(message);
        Alert.alert("Bump failed", message, [
          { text: "Dismiss", style: "cancel" },
          {
            text: "Retry",
            onPress: () => void bumpOrder(order),
          },
        ]);
      } finally {
        setBusyId(null);
      }
    },
    [data, load],
  );

  const emptyBoard =
    data !== null &&
    grouped.live.length === 0 &&
    grouped.later.length === 0 &&
    !error;
  const initialLoading = data === null && !error;

  const nextColumnWithWork = useMemo(() => {
    for (const column of KITCHEN_BOARD_COLUMNS) {
      if (column.id === "all") continue;
      if (
        column.id !== activeColumnId &&
        ordersForColumn(grouped.live, column.id).length > 0
      ) {
        return column;
      }
    }
    return null;
  }, [activeColumnId, grouped.live]);

  return (
    <SafeScreen>
      <OfflineBanner />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
          />
        }
      >
        <View style={styles.topRow}>
          <Text style={[KType.page, { flex: 1 }]}>
            {store?.name ?? "Kitchen"}
          </Text>
          <KitchenHeaderActions />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {initialLoading ? (
          <KitchenBoardSkeleton />
        ) : emptyBoard ? (
          <View style={styles.emptyBlock}>
            <Text style={styles.empty}>No active orders right now.</Text>
            <Pressable onPress={() => void load()} hitSlop={8}>
              <Text style={styles.emptyCta}>Pull to refresh · or tap here</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <ColumnTabs
              activeId={activeColumnId}
              onChange={selectColumn}
              columns={[
                {
                  id: "cooking",
                  title: "Cooking",
                  count: columnCounts.cooking,
                  hot: pendingOnBoard,
                },
                { id: "ready", title: "Ready", count: columnCounts.ready },
                { id: "all", title: "All", count: columnCounts.all },
              ]}
            />

            <View style={styles.list}>
              {activeOrders.length === 0 ? (
                <View style={styles.emptyBlock}>
                  <Text style={styles.emptyColumn}>
                    None in{" "}
                    {activeColumnId === "cooking"
                      ? "Cooking"
                      : activeColumnId === "ready"
                        ? "Ready"
                        : "All"}
                  </Text>
                  {nextColumnWithWork ? (
                    <Pressable
                      onPress={() => selectColumn(nextColumnWithWork.id)}
                      hitSlop={8}
                    >
                      <Text style={styles.emptyCta}>
                        Switch to {nextColumnWithWork.title}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : (
                activeOrders.map((order) => (
                  <TicketCard
                    key={order.id}
                    order={order}
                    bumpBusy={busyId === order.id}
                    onOpen={() => router.push(`/orders/${order.id}`)}
                    onBump={() => void bumpOrder(order)}
                    onLongPressBump={() => void bumpOrder(order)}
                  />
                ))
              )}
            </View>

            {grouped.later.length > 0 ? (
              <View style={styles.later}>
                <Pressable
                  onPress={() => setLaterOpen((open) => !open)}
                  style={styles.laterHeader}
                >
                  <Text style={KType.section}>
                    Later · {grouped.later.length}
                  </Text>
                  <Text style={KType.meta}>{laterOpen ? "Hide" : "Show"}</Text>
                </Pressable>
                {laterOpen
                  ? grouped.later.map((order) => (
                      <TicketCard
                        key={order.id}
                        order={order}
                        bumpBusy={busyId === order.id}
                        onOpen={() => router.push(`/orders/${order.id}`)}
                        onBump={() => void bumpOrder(order)}
                        onLongPressBump={() => void bumpOrder(order)}
                      />
                    ))
                  : null}
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
      {methodOrder ? (
        <DeliveryMethodSheet
          order={methodOrder.order}
          markReadyFirst={methodOrder.markReadyFirst}
          onCancel={() => setMethodOrder(null)}
          onDone={() => {
            setMethodOrder(null);
            void insistBumpConfirm();
            void load();
          }}
        />
      ) : null}
    </SafeScreen>
  );
}
