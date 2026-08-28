import { DinerTabHeader } from "@/components/diner-tab-header";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { loadRecentOrders, type RecentOrder } from "@/lib/recent-orders";
import { formatCadFromCents, type PublicOrderView } from "@naijajollof/api-types";
import { Button, Card, Colors, OrdersScreenSkeleton, Screen, Type } from "@naijajollof/ui";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
} from "react-native";

export default function OrdersScreen() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Array<PublicOrderView | RecentOrder>>([]);
  const [ready, setReady] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      async function load() {
        if (user) {
          try {
            const data = await apiFetch<PublicOrderView[]>("/api/diner/orders");
            if (!cancelled) setOrders(data);
          } catch {
            const recent = await loadRecentOrders();
            if (!cancelled) setOrders(recent);
          }
        } else {
          const recent = await loadRecentOrders();
          if (!cancelled) setOrders(recent);
        }
        if (!cancelled) setReady(true);
      }
      void load();
      return () => {
        cancelled = true;
      };
    }, [user]),
  );

  if (loading || !ready) {
    return (
      <Screen>
        {Platform.OS === "ios" ? <DinerTabHeader title="Orders" /> : null}
        <OrdersScreenSkeleton />
      </Screen>
    );
  }

  return (
    <Screen>
      {Platform.OS === "ios" ? <DinerTabHeader title="Orders" /> : null}
      <ScrollView contentContainerStyle={styles.content}>
        {!user ? (
          <Card style={{ gap: 10 }}>
            <Text style={Type.headline}>Sign in to sync history</Text>
            <Text style={Type.meta}>
              Guest orders stay on this phone. Create an account to see them everywhere.
            </Text>
            <Button label="Sign in" onPress={() => router.push("/login")} />
          </Card>
        ) : null}

        {orders.length === 0 ? (
          <Text style={Type.meta}>No orders yet. Your next jollof will show up here.</Text>
        ) : (
          orders.map((order) => (
            <Card
              key={order.id}
              onPress={() => router.push(`/orders/${order.id}?token=${order.publicToken}`)}
            >
              <Text style={styles.orderTitle}>{order.displayNumber ?? "Order"}</Text>
              <Text style={Type.meta}>
                {formatCadFromCents(order.totalCents)} · {order.statusMessage}
              </Text>
            </Card>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    gap: 12,
    paddingBottom: Platform.OS === "android" ? 120 : 48,
  },
  orderTitle: { fontWeight: "800", fontSize: 16, color: Colors.text, marginBottom: 4 },
});
