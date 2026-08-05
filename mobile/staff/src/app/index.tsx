import { Colors } from "@/constants/theme";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  formatCadFromCents,
  isKitchenBoardDeferred,
  KITCHEN_BOARD_COLUMNS,
  type ListStaffOrdersResult,
  type StaffOrderListItem,
} from "@naijajollof/api-types";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
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
    const id = setInterval(() => void load(), POLL_MS);
    return () => clearInterval(id);
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
    <ScrollView
      style={styles.scroll}
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
        <View>
          <Text style={styles.store}>{store?.name ?? "Kitchen"}</Text>
          <Text style={styles.meta}>
            {data?.pendingAcceptanceCount ?? 0} new · refreshes every 10s
          </Text>
        </View>
        <Pressable onPress={() => router.push("/account")} style={styles.accountBtn}>
          <Text style={styles.accountText}>Account</Text>
        </Pressable>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {KITCHEN_BOARD_COLUMNS.map((column) => {
        const items = grouped.live.filter((order) =>
          (column.statuses as readonly string[]).includes(order.status),
        );
        return (
          <View key={column.id} style={styles.column}>
            <Text style={styles.columnTitle}>
              {column.title} · {items.length}
            </Text>
            {items.length === 0 ? (
              <Text style={styles.empty}>None</Text>
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
        <Text style={styles.columnTitle}>Later · {grouped.later.length}</Text>
        {grouped.later.length === 0 ? (
          <Text style={styles.empty}>No scheduled tickets waiting</Text>
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
    <Pressable onPress={onPress} style={styles.card}>
      <View style={styles.cardTop}>
        <Text style={styles.ticket}>
          {order.displayNumber ?? (order.dayTicket ? `#${order.dayTicket}` : "Order")}
        </Text>
        <Text style={styles.total}>{formatCadFromCents(order.totalCents)}</Text>
      </View>
      <Text style={styles.customer}>{order.customerName}</Text>
      <Text style={styles.summary} numberOfLines={2}>
        {order.fulfillmentType === "delivery" ? "Delivery" : "Pickup"} · {order.itemSummary}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 48, gap: 16 },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  store: { fontSize: 22, fontWeight: "700", color: Colors.text },
  meta: { color: Colors.textSecondary, marginTop: 4 },
  accountBtn: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: Colors.surface,
  },
  accountText: { fontWeight: "600" },
  error: { color: Colors.danger },
  column: { gap: 8 },
  columnTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 4,
  },
  empty: { color: Colors.textSecondary },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    gap: 4,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between" },
  ticket: { fontWeight: "700", fontSize: 16 },
  total: { fontWeight: "700" },
  customer: { color: Colors.text },
  summary: { color: Colors.textSecondary },
});
