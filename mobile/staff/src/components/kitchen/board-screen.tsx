import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  ColumnTabs,
  type BoardColumnId,
} from "@/components/kitchen/column-tabs";
import { TicketCard } from "@/components/kitchen/ticket-card";
import {
  OfflineBanner,
  SessionTipBanner,
} from "@/components/kitchen/network-banners";
import {
  markBoardSeen,
  setBoardPendingAcceptance,
} from "@/lib/kitchen/board-attention";
import {
  getPersistedBoardColumn,
  setPersistedBoardColumn,
} from "@/lib/kitchen/board-column-state";
import { isStatusBump, primaryBumpFor } from "@/lib/kitchen/bump";
import { insistBumpConfirm, insistError } from "@/lib/kitchen/insist";
import { kvGet, kvSet } from "@/lib/kv";
import {
  isKitchenBoardDeferred,
  KITCHEN_BOARD_COLUMNS,
  type ListStaffOrdersResult,
  type OrderStatus,
  type StaffOrderListItem,
} from "@naijajollof/api-types";
import { Colors, KitchenBoardSkeleton } from "@naijajollof/ui";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  AppState,
  type AppStateStatus,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { KitchenHeaderActions } from "@/components/kitchen/header-actions";
import { SafeScreen } from "@/components/kitchen/safe-screen";
import { KType } from "@/lib/kitchen/typography";

const POLL_MS = 10_000;
const SESSION_TIP_KEY = "kitchen.sessionTip.dismissed";

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
    if (ordersForColumn(items, column.id).length > 0) {
      return column.id;
    }
  }
  return "new";
}

export function BoardScreen() {
  const router = useRouter();
  const { store } = useAuth();
  const persisted = getPersistedBoardColumn();
  const [data, setData] = useState<ListStaffOrdersResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [activeColumnId, setActiveColumnId] = useState<BoardColumnId>(
    persisted.activeColumnId,
  );
  const [columnTouched, setColumnTouched] = useState(persisted.columnTouched);
  const [laterOpen, setLaterOpen] = useState(false);
  const [showSessionTip, setShowSessionTip] = useState(false);

  useFocusEffect(
    useCallback(() => {
      markBoardSeen();
    }, []),
  );

  useEffect(() => {
    void kvGet(SESSION_TIP_KEY).then((v) => {
      if (v !== "1") setShowSessionTip(true);
    });
  }, []);

  useEffect(() => {
    setPersistedBoardColumn(activeColumnId, columnTouched);
  }, [activeColumnId, columnTouched]);

  const load = useCallback(async () => {
    try {
      const result = await apiFetch<ListStaffOrdersResult>(
        "/api/orders?filter=active&channel=kitchen&limit=80",
      );
      setData(result);
      setBoardPendingAcceptance(result.pendingAcceptanceCount ?? 0);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load board");
    }
  }, []);

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
      new: ordersForColumn(grouped.live, "new").length,
      cooking: ordersForColumn(grouped.live, "cooking").length,
      ready: ordersForColumn(grouped.live, "ready").length,
    };
  }, [grouped.live]);

  const activeOrders = ordersForColumn(grouped.live, activeColumnId);

  const selectColumn = useCallback((id: BoardColumnId) => {
    setColumnTouched(true);
    setActiveColumnId(id);
  }, []);

  const bumpOrder = useCallback(
    async (order: StaffOrderListItem) => {
      const bump = primaryBumpFor(order);
      if (!bump) return;

      if (!isStatusBump(bump)) {
        router.push(`/orders/${order.id}`);
        return;
      }

      const previous = data;
      setBusyId(order.id);
      setData((current) => {
        if (!current) return current;
        return {
          ...current,
          items: current.items.map((item) =>
            item.id === order.id
              ? { ...item, status: bump.to as OrderStatus }
              : item,
          ),
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
    [data, load, router],
  );

  const emptyBoard =
    data !== null &&
    grouped.live.length === 0 &&
    grouped.later.length === 0 &&
    !error;
  const initialLoading = data === null && !error;

  const nextColumnWithWork = useMemo(() => {
    for (const column of KITCHEN_BOARD_COLUMNS) {
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
      <SessionTipBanner
        visible={showSessionTip}
        onDismiss={() => {
          setShowSessionTip(false);
          void kvSet(SESSION_TIP_KEY, "1");
        }}
      />
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
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={KType.page}>{store?.name ?? "Kitchen"}</Text>
            <Pressable
              onPress={() => router.push("/orders")}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="All orders"
              style={styles.allOrdersBtn}
            >
              <Ionicons name="list-outline" size={14} color={Colors.accent} />
              <Text style={styles.allOrders}>All orders</Text>
              <Ionicons
                name="chevron-forward"
                size={12}
                color={Colors.accent}
              />
            </Pressable>
          </View>
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
                { id: "new", title: "New", count: columnCounts.new },
                {
                  id: "cooking",
                  title: "Cooking",
                  count: columnCounts.cooking,
                },
                { id: "ready", title: "Ready", count: columnCounts.ready },
              ]}
            />

            <View style={styles.list}>
              {activeOrders.length === 0 ? (
                <View style={styles.emptyBlock}>
                  <Text style={styles.emptyColumn}>
                    None in{" "}
                    {activeColumnId === "new"
                      ? "New"
                      : activeColumnId === "cooking"
                        ? "Cooking"
                        : "Ready"}
                  </Text>
                  {nextColumnWithWork ? (
                    <Pressable
                      onPress={() => selectColumn(nextColumnWithWork.id)}
                      hitSlop={8}
                    >
                      <Text style={styles.emptyCta}>
                        Switch to{" "}
                        {nextColumnWithWork.id === "new"
                          ? "New"
                          : nextColumnWithWork.id === "cooking"
                            ? "Cooking"
                            : "Ready"}
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
                        showPrice
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
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 100, gap: 16 },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  allOrdersBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
  },
  allOrders: { ...KType.metaStrong, color: Colors.accent },
  error: { ...KType.metaStrong, color: Colors.danger },
  emptyBlock: { alignItems: "center", gap: 8, marginTop: 24 },
  empty: {
    ...KType.meta,
    textAlign: "center",
    paddingHorizontal: 12,
  },
  emptyColumn: {
    ...KType.meta,
    textAlign: "center",
    paddingVertical: 12,
  },
  emptyCta: { ...KType.metaStrong, color: Colors.accent },
  list: { gap: 10 },
  later: { gap: 10, marginTop: 8 },
  laterHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
});
