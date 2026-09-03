import { StackScroll } from "@/components/kitchen/stack-scroll";
import { KType } from "@/lib/kitchen/typography";
import { apiFetch } from "@/lib/api";
import {
  formatCadFromCents,
  type ListStaffOrdersResult,
  type StaffOrderListItem,
} from "@naijajollof/api-types";
import {
  Card,
  Colors,
  OrdersScreenSkeleton,
  Radii,
  Screen,
  Touch,
} from "@naijajollof/ui";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

type OrderFilter = "active" | "completed" | "cancelled" | "all";

const FILTERS: Array<{ id: OrderFilter; label: string }> = [
  { id: "active", label: "Active" },
  { id: "completed", label: "Completed" },
  { id: "cancelled", label: "Cancelled" },
  { id: "all", label: "All" },
];

function ticketLabel(order: StaffOrderListItem): string {
  return (
    order.displayNumber ??
    (order.dayTicket ? `#${order.dayTicket}` : "Order")
  );
}

export default function OrdersListScreen() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [filter, setFilter] = useState<OrderFilter>("active");
  const [data, setData] = useState<ListStaffOrdersResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(id);
  }, [q]);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        filter,
        channel: "kitchen",
        limit: "50",
      });
      if (debouncedQ) params.set("q", debouncedQ);
      const result = await apiFetch<ListStaffOrdersResult>(
        `/api/orders?${params.toString()}`,
      );
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load orders");
    }
  }, [filter, debouncedQ]);

  useEffect(() => {
    void load();
  }, [load]);

  const initialLoading = data === null && !error;

  return (
    <Screen>
      <StackScroll
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
        <View style={styles.search}>
          <Ionicons
            name="search-outline"
            size={18}
            color={Colors.textSecondary}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Ticket #, name, phone"
            placeholderTextColor={Colors.textSecondary}
            value={q}
            onChangeText={setQ}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            clearButtonMode="never"
            accessibilityLabel="Search orders"
          />
          {q.length > 0 ? (
            <Pressable
              onPress={() => setQ("")}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              style={styles.clearBtn}
            >
              <Ionicons
                name="close-circle"
                size={18}
                color={Colors.textSecondary}
              />
            </Pressable>
          ) : null}
        </View>

        <View style={styles.segments} accessibilityRole="tablist">
          {FILTERS.map((item) => {
            const selected = filter === item.id;
            return (
              <Pressable
                key={item.id}
                onPress={() => setFilter(item.id)}
                style={[styles.segment, selected && styles.segmentSelected]}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
              >
                <Text
                  style={[
                    styles.segmentLabel,
                    selected && styles.segmentLabelSelected,
                  ]}
                  numberOfLines={1}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {initialLoading ? (
          <OrdersScreenSkeleton />
        ) : data?.items.length === 0 ? (
          <Text style={styles.empty}>No orders match.</Text>
        ) : (
          <View style={styles.list}>
            {data?.items.map((order) => (
              <Pressable
                key={order.id}
                onPress={() => router.push(`/orders/${order.id}`)}
              >
                <Card style={styles.row}>
                  <View style={styles.rowTop}>
                    <Text style={KType.bodyStrong}>{ticketLabel(order)}</Text>
                    <Text style={KType.numeric}>
                      {formatCadFromCents(order.totalCents)}
                    </Text>
                  </View>
                  <Text style={KType.meta}>{order.customerName}</Text>
                  <Text style={KType.meta}>
                    {order.status.replaceAll("_", " ")}
                    {" · "}
                    {order.fulfillmentType === "delivery" ? "Delivery" : "Pickup"}
                  </Text>
                </Card>
              </Pressable>
            ))}
          </View>
        )}
      </StackScroll>
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: {
    minHeight: Touch.min,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    borderRadius: Radii.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  searchInput: {
    flex: 1,
    minHeight: Touch.min,
    paddingVertical: 10,
    fontSize: 16,
    color: Colors.text,
  },
  clearBtn: {
    padding: 2,
  },
  segments: {
    flexDirection: "row",
    gap: 4,
    padding: 4,
    borderRadius: Radii.md,
    backgroundColor: Colors.backgroundWash,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  segment: {
    flex: 1,
    minHeight: 36,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    borderRadius: Radii.sm,
  },
  segmentSelected: {
    backgroundColor: Colors.accent,
  },
  segmentLabel: {
    ...KType.label,
    fontSize: 12,
    fontWeight: "500",
    color: Colors.textSecondary,
  },
  segmentLabelSelected: {
    fontWeight: "600",
    color: Colors.inverse,
  },
  list: { gap: 10 },
  row: { gap: 4 },
  rowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  error: { ...KType.metaStrong, color: Colors.danger },
  empty: { ...KType.meta, textAlign: "center", marginTop: 32 },
});
