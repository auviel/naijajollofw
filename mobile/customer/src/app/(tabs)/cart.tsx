import { DinerTabHeader } from "@/components/diner-tab-header";
import { apiFetch } from "@/lib/api";
import { useCart } from "@/lib/cart";
import { formatCadFromCents } from "@naijajollof/api-types";
import { Button, Card, Colors, Radii, Screen, Type } from "@naijajollof/ui";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function CartScreen() {
  const router = useRouter();
  const { cart, loading, refresh } = useCart();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const setQty = useCallback(
    async (lineId: string, quantity: number) => {
      setBusyId(lineId);
      try {
        if (quantity <= 0) {
          await apiFetch(`/api/cart/${lineId}`, { method: "DELETE" });
        } else {
          await apiFetch(`/api/cart/${lineId}`, {
            method: "PATCH",
            body: JSON.stringify({ quantity }),
          });
        }
        await refresh();
      } finally {
        setBusyId(null);
      }
    },
    [refresh],
  );

  if (loading && cart.items.length === 0) {
    return (
      <Screen style={styles.center}>
        <ActivityIndicator color={Colors.accent} />
      </Screen>
    );
  }

  return (
    <Screen>
      {Platform.OS === "ios" ? <DinerTabHeader title="Cart" /> : null}
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void refresh().finally(() => setRefreshing(false));
            }}
          />
        }
      >
        {cart.items.length === 0 ? (
          <Card style={{ gap: 10 }}>
            <Text style={Type.title}>Your cart is empty</Text>
            <Text style={Type.meta}>Add jollof from the menu to get started.</Text>
            <Button label="Browse menu" onPress={() => router.push("/")} />
          </Card>
        ) : (
          cart.items.map((line) => (
            <Card key={line.id} style={{ gap: 8 }}>
              <View style={styles.lineTop}>
                <Text style={styles.name}>{line.name}</Text>
                <Text style={styles.price}>{formatCadFromCents(line.lineTotalCents)}</Text>
              </View>
              {(line.modifiers ?? []).length > 0 ? (
                <Text style={Type.meta}>
                  {(line.modifiers ?? []).map((mod) => mod.name).join(" · ")}
                </Text>
              ) : null}
              {!line.available ? (
                <Text style={{ color: Colors.danger, fontWeight: "700" }}>No longer available</Text>
              ) : null}
              <View style={styles.qtyRow}>
                <Pressable
                  disabled={busyId === line.id}
                  onPress={() => void setQty(line.id, line.quantity - 1)}
                  style={styles.qtyBtn}
                >
                  <Text style={styles.qtyLabel}>−</Text>
                </Pressable>
                <Text style={styles.qty}>{line.quantity}</Text>
                <Pressable
                  disabled={busyId === line.id}
                  onPress={() => void setQty(line.id, line.quantity + 1)}
                  style={styles.qtyBtn}
                >
                  <Text style={styles.qtyLabel}>+</Text>
                </Pressable>
              </View>
            </Card>
          ))
        )}

        {cart.items.length > 0 ? (
          <>
            <Text style={Type.headline}>Subtotal {formatCadFromCents(cart.subtotalCents)}</Text>
            <Button label="Checkout" onPress={() => router.push("/checkout")} />
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center" },
  content: {
    padding: 20,
    gap: 12,
    paddingBottom: Platform.OS === "android" ? 120 : 48,
  },
  lineTop: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  name: { fontWeight: "800", flex: 1, fontSize: 16, color: Colors.text },
  price: { fontWeight: "800", color: Colors.text },
  qtyRow: { flexDirection: "row", alignItems: "center", gap: 14, marginTop: 4 },
  qtyBtn: {
    width: 44,
    height: 44,
    borderRadius: Radii.pill,
    backgroundColor: Colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyLabel: { fontSize: 22, fontWeight: "800", color: Colors.accent },
  qty: { fontWeight: "800", minWidth: 18, textAlign: "center", fontSize: 16 },
});
