import { Colors } from "@/constants/theme";
import { apiFetch } from "@/lib/api";
import { formatCadFromCents, type StaffOrderDetail } from "@naijajollof/api-types";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
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

  async function transition(to: string, note?: string) {
    if (!id) return;
    setBusy(to);
    try {
      const data = await apiFetch<StaffOrderDetail>(`/api/orders/${id}/transition`, {
        method: "POST",
        body: JSON.stringify({ to, note }),
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
      const data = await apiFetch<StaffOrderDetail>(
        `/api/orders/${id}/fulfill/manual`,
        { method: "POST", body: JSON.stringify({}) },
      );
      setOrder(data);
    } catch (err) {
      Alert.alert("Could not dispatch", err instanceof Error ? err.message : "Try again");
    } finally {
      setBusy(null);
    }
  }

  if (!order) {
    return (
      <View style={styles.center}>
        {error ? <Text style={styles.error}>{error}</Text> : <ActivityIndicator color={Colors.accent} />}
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.number}>
        {order.displayNumber ?? (order.dayTicket ? `#${order.dayTicket}` : order.id)}
      </Text>
      <Text style={styles.meta}>
        {order.fulfillmentType === "delivery" ? "Delivery" : "Pickup"} · {order.status.replaceAll("_", " ")}
      </Text>
      <Text style={styles.customer}>
        {order.customerName} · {order.customerPhone}
      </Text>
      {order.dropoffAddress ? (
        <Text style={styles.meta}>{order.dropoffAddress}</Text>
      ) : null}
      {order.notes ? <Text style={styles.notes}>Notes: {order.notes}</Text> : null}
      {order.scheduledFor ? (
        <Text style={styles.meta}>
          Scheduled {new Date(order.scheduledFor).toLocaleString("en-CA")}
        </Text>
      ) : null}

      <View style={styles.lines}>
        {order.lineItems.map((line) => (
          <View key={line.id} style={styles.line}>
            <Text style={styles.lineName}>
              {line.quantity > 1 ? `${line.quantity}× ` : ""}
              {line.name}
            </Text>
            {line.modifiers.length > 0 ? (
              <Text style={styles.mods}>{line.modifiers.map((m) => m.name).join(", ")}</Text>
            ) : null}
            <Text style={styles.lineTotal}>{formatCadFromCents(line.lineTotalCents)}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.total}>Total {formatCadFromCents(order.totalCents)}</Text>

      <View style={styles.actions}>
        {order.allowedActions.map((action) => (
          <Pressable
            key={action.to}
            disabled={Boolean(busy)}
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
            style={[
              styles.action,
              action.variant === "danger" ? styles.danger : styles.primary,
              busy === action.to && styles.busy,
            ]}
          >
            <Text style={styles.actionText}>
              {busy === action.to ? "Working…" : action.label}
            </Text>
          </Pressable>
        ))}
        {order.needsFulfillment ? (
          <Pressable
            disabled={Boolean(busy)}
            onPress={() => void fulfillManual()}
            style={[styles.action, styles.secondary, busy === "manual" && styles.busy]}
          >
            <Text style={[styles.actionText, styles.secondaryText]}>
              {busy === "manual" ? "Working…" : "Out for delivery (manual)"}
            </Text>
          </Pressable>
        ) : null}
      </View>

      <Pressable onPress={() => router.back()}>
        <Text style={styles.back}>Back to board</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: 16, gap: 8, paddingBottom: 48 },
  number: { fontSize: 28, fontWeight: "800", color: Colors.text },
  meta: { color: Colors.textSecondary },
  customer: { fontSize: 16, fontWeight: "600", marginTop: 4 },
  notes: { color: Colors.text, backgroundColor: Colors.surface, padding: 12, borderRadius: 10 },
  lines: { marginTop: 12, gap: 10 },
  line: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 12,
  },
  lineName: { fontWeight: "600" },
  mods: { color: Colors.textSecondary, marginTop: 4 },
  lineTotal: { marginTop: 4, fontWeight: "600" },
  total: { fontSize: 18, fontWeight: "800", marginTop: 8 },
  actions: { gap: 10, marginTop: 16 },
  action: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  primary: { backgroundColor: Colors.accent },
  secondary: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  danger: { backgroundColor: Colors.danger },
  busy: { opacity: 0.6 },
  actionText: { color: Colors.inverse, fontWeight: "800", fontSize: 16 },
  secondaryText: { color: Colors.text },
  error: { color: Colors.danger },
  back: { textAlign: "center", marginTop: 16, color: Colors.success, fontWeight: "600" },
});
