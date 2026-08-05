import { Colors } from "@/constants/theme";
import { apiFetch } from "@/lib/api";
import { type PublicOrderView } from "@naijajollof/api-types";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";

export default function TrackOrderScreen() {
  const { id, token } = useLocalSearchParams<{ id: string; token?: string }>();
  const [order, setOrder] = useState<PublicOrderView | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id || !token) {
      setError("Missing tracking token.");
      return;
    }
    try {
      const data = await apiFetch<PublicOrderView>(`/api/orders/${id}?token=${token}`);
      setOrder(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load order");
    }
  }, [id, token]);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 12_000);
    return () => clearInterval(timer);
  }, [load]);

  if (error) {
    return <Text style={styles.error}>{error}</Text>;
  }
  if (!order) {
    return <Text style={styles.meta}>Loading…</Text>;
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.number}>{order.displayNumber ?? "Order"}</Text>
      <Text style={styles.status}>{order.statusMessage}</Text>
      <Text style={styles.meta}>
        {order.fulfillmentType === "delivery" ? "Delivery" : "Pickup"} ·{" "}
        {order.storeName}
      </Text>
      {order.lineItems.map((line) => (
        <Text key={line.id} style={styles.line}>
          {line.quantity}× {line.name}
        </Text>
      ))}
      {order.tracking?.url ? (
        <Text style={styles.meta}>Courier: {order.tracking.url}</Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 8 },
  number: { fontSize: 28, fontWeight: "800" },
  status: { fontSize: 18, fontWeight: "700", color: Colors.accent },
  meta: { color: Colors.textSecondary, padding: 16 },
  line: { fontWeight: "600" },
  error: { color: Colors.danger, padding: 16 },
});
