import { apiFetch } from "@/lib/api";
import { rememberOrder } from "@/lib/recent-orders";
import { formatCadFromCents, type PublicOrderView } from "@naijajollof/api-types";
import { Card, Colors, Screen, Type } from "@naijajollof/ui";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function TrackOrderScreen() {
  const { id, token } = useLocalSearchParams<{ id: string; token?: string }>();
  const [order, setOrder] = useState<PublicOrderView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!id || !token) {
      setError("Missing tracking token.");
      return;
    }
    const data = await apiFetch<PublicOrderView>(`/api/orders/${id}?token=${token}`);
    setOrder(data);
    setError(null);
    await rememberOrder(data);
  }, [id, token]);

  useEffect(() => {
    void load().catch((err: unknown) =>
      setError(err instanceof Error ? err.message : "Could not load order"),
    );
  }, [load]);

  useEffect(() => {
    if (!order) {
      return;
    }
    if (order.status === "completed" || order.status === "cancelled") {
      return;
    }
    const timer = setInterval(() => {
      void load().catch(() => undefined);
    }, 12_000);
    return () => clearInterval(timer);
  }, [load, order?.status]);

  if (error && !order) {
    return (
      <Screen>
        <Text style={styles.error}>{error}</Text>
      </Screen>
    );
  }
  if (!order) {
    return (
      <Screen>
        <Text style={Type.meta}>Loading…</Text>
      </Screen>
    );
  }

  return (
    <Screen>
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            void load()
              .catch(() => undefined)
              .finally(() => setRefreshing(false));
          }}
        />
      }
    >
      <Text style={Type.display}>{order.displayNumber ?? "Order"}</Text>
      <Text style={styles.status}>{order.statusMessage}</Text>
      <Text style={Type.meta}>
        {order.fulfillmentType === "delivery" ? "Delivery" : "Pickup"} · {order.storeName}
      </Text>
      {order.scheduledFor ? (
        <Text style={Type.meta}>
          Scheduled {new Date(order.scheduledFor).toLocaleString("en-CA")}
        </Text>
      ) : null}

      {order.timeline?.cancelled ? (
        <Text style={styles.error}>This order was cancelled.</Text>
      ) : null}

      {order.timeline?.steps.map((step) => (
        <View key={step.id} style={styles.step}>
          <View
            style={[
              styles.dot,
              step.state === "complete" && styles.dotDone,
              step.state === "current" && styles.dotCurrent,
            ]}
          />
          <View style={{ flex: 1 }}>
            <Text
              style={[
                styles.stepLabel,
                step.state === "upcoming" && styles.stepMuted,
              ]}
            >
              {step.label}
            </Text>
            <Text style={styles.stepDesc}>{step.description}</Text>
          </View>
        </View>
      ))}

      <Card style={{ gap: 8 }}>
        {order.lineItems.map((line) => (
          <View key={line.id} style={styles.line}>
            <Text style={styles.lineName}>
              {line.quantity}× {line.name}
            </Text>
            <Text>{formatCadFromCents(line.lineTotalCents)}</Text>
          </View>
        ))}
        {order.tipCents ? (
          <Text style={Type.meta}>Tip {formatCadFromCents(order.tipCents)}</Text>
        ) : null}
        <Text style={styles.total}>Total {formatCadFromCents(order.totalCents)}</Text>
      </Card>

      {order.tracking?.url ? (
        <Pressable onPress={() => void Linking.openURL(order.tracking!.url!)}>
          <Text style={styles.link}>
            Track courier{order.tracking.providerLabel ? ` · ${order.tracking.providerLabel}` : ""}
          </Text>
        </Pressable>
      ) : null}
    </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 10, paddingBottom: 40 },
  status: { fontSize: 18, fontWeight: "800", color: Colors.accent },
  error: { color: Colors.danger, padding: 20 },
  step: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
    backgroundColor: "#ddd",
  },
  dotDone: { backgroundColor: Colors.success },
  dotCurrent: { backgroundColor: Colors.accent },
  stepLabel: { fontWeight: "800" },
  stepMuted: { color: Colors.textSecondary },
  stepDesc: { color: Colors.textSecondary, fontSize: 13 },
  line: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  lineName: { flex: 1, fontWeight: "600" },
  total: { fontWeight: "800", marginTop: 4 },
  link: { color: Colors.success, fontWeight: "700", marginTop: 8 },
});
