import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  formatCadFromCents,
  isKitchenBoardDeferred,
  KITCHEN_BOARD_COLUMNS,
  type ListStaffOrdersResult,
  type StaffOrderListItem,
} from "@naijajollof/api-types";
import { Card, Colors, GlassSurface, Radii, Screen, Type } from "@naijajollof/ui";
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

const POLL_MS = 10_000;

export default function KitchenBoardScreen() {
  const router = useRouter();
  const { store } = useAuth();
  const [data, setData] = useState<ListStaffOrdersResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

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
      if (id) {
        clearInterval(id);
      }
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
    return { live, later };
  }, [data?.items, prepMinutes]);

  return (
    <Screen>
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
            <Text style={Type.display}>{store?.name ?? "Kitchen"}</Text>
            <Text style={Type.meta}>
              {data?.pendingAcceptanceCount ?? 0} new · refreshes every 10s
            </Text>
          </View>
          <Pressable onPress={() => router.push("/account")}>
            <GlassSurface interactive style={styles.accountBtn}>
              <Text style={styles.accountText}>Account</Text>
            </GlassSurface>
          </Pressable>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {KITCHEN_BOARD_COLUMNS.map((column) => {
          const items = grouped.live.filter((order) =>
            (column.statuses as readonly string[]).includes(order.status),
          );
          return (
            <View key={column.id} style={styles.column}>
              <Text style={Type.headline}>
                {column.title} · {items.length}
              </Text>
              {items.length === 0 ? (
                <Text style={Type.meta}>None</Text>
              ) : (
                items.map((order) => (
                  <TicketCard
                    key={order.id}
                    order={order}
                    onPress={() => router.push(`/orders/${order.id}`)}
                  />
                ))
              )}
            </View>
          );
        })}

        <View style={styles.column}>
          <Text style={Type.headline}>Later · {grouped.later.length}</Text>
          {grouped.later.length === 0 ? (
            <Text style={Type.meta}>No scheduled tickets waiting</Text>
          ) : (
            grouped.later.map((order) => (
              <TicketCard
                key={order.id}
                order={order}
                onPress={() => router.push(`/orders/${order.id}`)}
              />
            ))
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

function TicketCard({
  order,
  onPress,
}: {
  order: StaffOrderListItem;
  onPress: () => void;
}) {
  return (
    <Card onPress={onPress}>
      <View style={styles.cardTop}>
        <Text style={styles.ticket}>
          {order.displayNumber ?? (order.dayTicket ? `#${order.dayTicket}` : "Order")}
        </Text>
        <Text style={styles.total}>{formatCadFromCents(order.totalCents)}</Text>
      </View>
      <Text style={styles.customer}>{order.customerName}</Text>
      <Text style={Type.meta} numberOfLines={2}>
        {order.fulfillmentType === "delivery" ? "Delivery" : "Pickup"} · {order.itemSummary}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 48, gap: 16 },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  accountBtn: {
    borderRadius: Radii.pill,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 48,
    justifyContent: "center",
  },
  accountText: { fontWeight: "800", color: Colors.text },
  error: { color: Colors.danger },
  column: { gap: 10 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  ticket: { fontWeight: "800", fontSize: 17, color: Colors.text },
  total: { fontWeight: "800", color: Colors.text },
  customer: { color: Colors.text, fontWeight: "600", marginBottom: 2 },
});
