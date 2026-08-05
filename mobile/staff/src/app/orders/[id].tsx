import { apiFetch } from "@/lib/api";
import { formatCadFromCents, type StaffOrderDetail } from "@naijajollof/api-types";
import { Button, Card, Colors, Screen, Type } from "@naijajollof/ui";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function TicketScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<StaffOrderDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const data = await apiFetch<StaffOrderDetail>(`/api/orders/${id}`);
      setOrder(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load ticket");
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function transition(to: string) {
    if (!id) return;
    setBusy(to);
    try {
      const data = await apiFetch<StaffOrderDetail>(`/api/orders/${id}/transition`, {
        method: "POST",
        body: JSON.stringify({ to }),
      });
      setOrder(data);
    } catch (err) {
      Alert.alert("Could not update", err instanceof Error ? err.message : "Try again");
    } finally {
      setBusy(null);
    }
  }

  async function fulfillManual() {
    if (!id) return;
    setBusy("manual");
    try {
      const data = await apiFetch<StaffOrderDetail>(`/api/orders/${id}/fulfill/manual`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      setOrder(data);
    } catch (err) {
      Alert.alert("Could not dispatch", err instanceof Error ? err.message : "Try again");
    } finally {
      setBusy(null);
    }
  }

  if (!order) {
    return (
      <Screen style={styles.center}>
        {error ? (
          <Text style={styles.error}>{error}</Text>
        ) : (
          <ActivityIndicator color={Colors.accent} />
        )}
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={Type.display}>
          {order.displayNumber ?? (order.dayTicket ? `#${order.dayTicket}` : order.id)}
        </Text>
        <Text style={Type.meta}>
          {order.fulfillmentType === "delivery" ? "Delivery" : "Pickup"} ·{" "}
          {order.status.replaceAll("_", " ")}
        </Text>
        <Text style={styles.customer}>
          {order.customerName} · {order.customerPhone}
        </Text>
        {order.dropoffAddress ? <Text style={Type.meta}>{order.dropoffAddress}</Text> : null}
        {order.notes ? (
          <Card>
            <Text style={Type.caption}>NOTES</Text>
            <Text style={Type.body}>{order.notes}</Text>
          </Card>
        ) : null}
        {order.scheduledFor ? (
          <Text style={Type.meta}>
            Scheduled {new Date(order.scheduledFor).toLocaleString("en-CA")}
          </Text>
        ) : null}

        <View style={{ gap: 10 }}>
          {order.lineItems.map((line) => (
            <Card key={line.id}>
              <Text style={styles.lineName}>
                {line.quantity > 1 ? `${line.quantity}× ` : ""}
                {line.name}
              </Text>
              {line.modifiers.length > 0 ? (
                <Text style={Type.meta}>{line.modifiers.map((m) => m.name).join(", ")}</Text>
              ) : null}
              <Text style={styles.lineTotal}>{formatCadFromCents(line.lineTotalCents)}</Text>
            </Card>
          ))}
        </View>
        <Text style={Type.headline}>Total {formatCadFromCents(order.totalCents)}</Text>

        <View style={styles.actions}>
          {order.allowedActions.map((action) => (
            <Button
              key={action.to}
              disabled={Boolean(busy)}
              variant={action.variant === "danger" ? "danger" : "primary"}
              label={busy === action.to ? "Working…" : action.label}
              onPress={() => {
                if (action.variant === "danger") {
                  Alert.alert("Cancel this order?", undefined, [
                    { text: "Keep", style: "cancel" },
                    {
                      text: "Cancel order",
                      style: "destructive",
                      onPress: () => void transition(action.to),
                    },
                  ]);
                  return;
                }
                void transition(action.to);
              }}
            />
          ))}
          {order.needsFulfillment ? (
            <Button
              disabled={Boolean(busy)}
              variant="secondary"
              label={busy === "manual" ? "Working…" : "Out for delivery (manual)"}
              onPress={() => void fulfillManual()}
            />
          ) : null}
        </View>

        <Button variant="ghost" label="Back to board" onPress={() => router.back()} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center" },
  content: { padding: 20, gap: 10, paddingBottom: 48 },
  customer: { fontSize: 16, fontWeight: "700", color: Colors.text },
  lineName: { fontWeight: "700", color: Colors.text },
  lineTotal: { marginTop: 6, fontWeight: "700" },
  actions: { gap: 10, marginTop: 8 },
  error: { color: Colors.danger },
});
