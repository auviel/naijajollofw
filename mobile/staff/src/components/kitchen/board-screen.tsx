import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  ColumnTabs,
  type BoardColumnId,
} from "@/components/kitchen/column-tabs";
import { TicketCard } from "@/components/kitchen/ticket-card";
import {
  isStatusBump,
  primaryBumpFor,
} from "@/lib/kitchen/bump";
import {
  isKitchenBoardDeferred,
  KITCHEN_BOARD_COLUMNS,
  type ListStaffOrdersResult,
  type OrderStatus,
  type StaffOrderListItem,
} from "@naijajollof/api-types";
import { Colors, KitchenBoardSkeleton } from "@naijajollof/ui";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AppState,
  type AppStateStatus,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeScreen } from "@/components/kitchen/safe-screen";
import { KType } from "@/lib/kitchen/typography";

const POLL_MS = 10_000;

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
  const [data, setData] = useState<ListStaffOrdersResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [activeColumnId, setActiveColumnId] = useState<BoardColumnId>("new");
  const [columnTouched, setColumnTouched] = useState(false);
  const [laterOpen, setLaterOpen] = useState(true);

  const load = useCallback(async () => {
    try {
      const result = await apiFetch<ListStaffOrdersResult>(
        "/api/orders?filter=active&channel=kitchen&limit=80",
      );
      setData(result);
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

  async function bumpOrder(order: StaffOrderListItem) {
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

    try {
      await apiFetch(`/api/orders/${order.id}/transition`, {
        method: "POST",
        body: JSON.stringify({ to: bump.to }),
      });
      await load();
    } catch (err) {
      setData(previous);
      setError(err instanceof Error ? err.message : "Bump failed");
    } finally {
      setBusyId(null);
    }
  }

  const emptyBoard =
    data !== null &&
    grouped.live.length === 0 &&
    grouped.later.length === 0 &&
    !error;
  const initialLoading = data === null && !error;

  return (
    <SafeScreen>
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
          <View style={{ flex: 1 }}>
            <Text style={KType.page}>{store?.name ?? "Kitchen"}</Text>
            {!initialLoading ? (
              <Text style={KType.meta}>
                {data?.pendingAcceptanceCount ?? 0} new
              </Text>
            ) : null}
          </View>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {initialLoading ? (
          <KitchenBoardSkeleton />
        ) : emptyBoard ? (
          <Text style={styles.empty}>
            No active orders. Pull to refresh — new paid tickets land here.
          </Text>
        ) : (
          <>
            <ColumnTabs
              activeId={activeColumnId}
              onChange={(id) => {
                setColumnTouched(true);
                setActiveColumnId(id);
              }}
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
                <Text style={styles.emptyColumn}>None in this column</Text>
              ) : (
                activeOrders.map((order) => (
                  <TicketCard
                    key={order.id}
                    order={order}
                    bumpBusy={busyId === order.id}
                    onOpen={() => router.push(`/orders/${order.id}`)}
                    onBump={() => void bumpOrder(order)}
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
  error: { ...KType.metaStrong, color: Colors.danger },
  empty: {
    ...KType.meta,
    textAlign: "center",
    marginTop: 40,
    paddingHorizontal: 12,
  },
  emptyColumn: {
    ...KType.meta,
    textAlign: "center",
    paddingVertical: 36,
  },
  list: { gap: 10 },
  later: { gap: 10, marginTop: 8 },
  laterHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
});
