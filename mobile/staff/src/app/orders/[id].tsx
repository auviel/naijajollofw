import { apiFetch } from "@/lib/api";
import { KType } from "@/lib/kitchen/typography";
import { formatCadFromCents, type StaffOrderDetail } from "@naijajollof/api-types";
import { Button, Card, Colors, KitchenTicketSkeleton, Screen } from "@naijajollof/ui";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
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
      <Screen>
        {error ? (
          <Text style={[styles.error, { margin: 20 }]}>{error}</Text>
        ) : (
          <KitchenTicketSkeleton />
        )}
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={KType.title}>
          {order.displayNumber ?? (order.dayTicket ? `#${order.dayTicket}` : order.id)}
        </Text>
        <Text style={KType.meta}>
          {order.fulfillmentType === "delivery" ? "Delivery" : "Pickup"} ·{" "}
          {order.status.replaceAll("_", " ")}
        </Text>
        <Text style={KType.bodyStrong}>
          {order.customerName} · {order.customerPhone}
        </Text>
        {order.dropoffAddress ? (
          <Text style={KType.meta}>{order.dropoffAddress}</Text>
        ) : null}
        {order.notes ? (
          <Card>
            <Text style={KType.kicker}>Notes</Text>
            <Text style={KType.body}>{order.notes}</Text>
          </Card>
        ) : null}
        {order.scheduledFor ? (
          <Text style={KType.meta}>
            Scheduled {new Date(order.scheduledFor).toLocaleString("en-CA")}
          </Text>
        ) : null}

        <View style={styles.lines}>
          {order.lineItems.map((line) => (
            <Card key={line.id}>
              <Text style={KType.bodyStrong}>
                {line.quantity > 1 ? `${line.quantity}× ` : ""}
                {line.name}
              </Text>
              {line.modifiers.length > 0 ? (
                <Text style={KType.meta}>
                  {line.modifiers.map((m) => m.name).join(", ")}
                </Text>
              ) : null}
              <Text style={styles.lineTotal}>
                {formatCadFromCents(line.lineTotalCents)}
              </Text>
            </Card>
          ))}
        </View>
        <Text style={KType.section}>
          Total {formatCadFromCents(order.totalCents)}
        </Text>

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
  content: { padding: 20, gap: 10, paddingBottom: 48 },
  lines: { gap: 10 },
  lineTotal: { ...KType.numeric, marginTop: 6 },
  actions: { gap: 10, marginTop: 8 },
  error: { ...KType.metaStrong, color: Colors.danger },
});
