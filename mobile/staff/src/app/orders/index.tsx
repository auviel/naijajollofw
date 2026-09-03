import { StackScroll } from "@/components/kitchen/stack-scroll";
import { KType } from "@/lib/kitchen/typography";
import { useThemedStyles } from "@/lib/kitchen/use-themed-styles";
import { apiFetch } from "@/lib/api";
import {
  type ListStaffOrdersResult,
  type StaffOrderListItem,
} from "@naijajollof/api-types";
import { SearchField } from "@/components/kitchen/search-field";
import { Card, OrdersScreenSkeleton, Radii, Screen } from "@naijajollof/ui";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

type OrderFilter = "active" | "completed" | "all";

const FILTERS: Array<{ id: OrderFilter; label: string }> = [
  { id: "active", label: "Active" },
  { id: "completed", label: "Done" },
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
  const styles = useThemedStyles((c) => ({
    segments: {
      flexDirection: "row" as const,
      gap: 4,
      padding: 4,
      borderRadius: Radii.md,
      backgroundColor: c.backgroundWash,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
    },
    segment: {
      flex: 1,
      minHeight: 36,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      paddingHorizontal: 6,
      borderRadius: Radii.sm,
    },
    segmentSelected: {
      backgroundColor: c.accent,
    },
    segmentLabel: {
      ...KType.label,
      fontSize: 12,
      fontWeight: "500" as const,
      color: c.textSecondary,
    },
    segmentLabelSelected: {
      fontWeight: "600" as const,
      color: c.inverse,
    },
    list: { gap: 10 },
    row: { gap: 2 },
    rowTop: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      alignItems: "center" as const,
      gap: 12,
    },
    error: { ...KType.metaStrong, color: c.danger },
    empty: { ...KType.meta, textAlign: "center" as const, marginTop: 32 },
  }));
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
        <SearchField
          value={q}
          onChangeText={setQ}
          placeholder="Ticket #, name, phone"
          accessibilityLabel="Search orders"
        />

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
                    <Text style={KType.meta}>
                      {order.status.replaceAll("_", " ")}
                    </Text>
                  </View>
                  <Text style={KType.meta}>{order.customerName}</Text>
                </Card>
              </Pressable>
            ))}
          </View>
        )}
      </StackScroll>
    </Screen>
  );
}
