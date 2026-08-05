import { Colors } from "@/constants/theme";
import { apiFetch } from "@/lib/api";
import { formatCadFromCents, type CartView } from "@naijajollof/api-types";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

export default function CartScreen() {
  const router = useRouter();
  const [cart, setCart] = useState<CartView | null>(null);

  const load = useCallback(async () => {
    const data = await apiFetch<CartView>("/api/cart");
    setCart(data);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function setQty(lineId: string, quantity: number) {
    if (quantity <= 0) {
      await apiFetch(`/api/cart/${lineId}`, { method: "DELETE" });
    } else {
      await apiFetch(`/api/cart/${lineId}`, {
        method: "PATCH",
        body: JSON.stringify({ quantity }),
      });
    }
    await load();
  }

  if (!cart) {
    return <Text style={styles.empty}>Loading cart…</Text>;
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {cart.items.length === 0 ? (
        <Text style={styles.empty}>Your cart is empty.</Text>
      ) : (
        cart.items.map((line) => (
          <View key={line.id} style={styles.line}>
            <Text style={styles.name}>
              {line.quantity}× {line.name}
            </Text>
            <Text>{formatCadFromCents(line.lineTotalCents)}</Text>
            <View style={styles.qtyRow}>
              <Pressable onPress={() => void setQty(line.id, line.quantity - 1)}>
                <Text style={styles.qtyBtn}>−</Text>
              </Pressable>
              <Pressable onPress={() => void setQty(line.id, line.quantity + 1)}>
                <Text style={styles.qtyBtn}>+</Text>
              </Pressable>
            </View>
          </View>
        ))
      )}
      <Text style={styles.total}>Subtotal {formatCadFromCents(cart.subtotalCents)}</Text>
      <Pressable
        disabled={cart.items.length === 0}
        onPress={() => router.push("/checkout")}
        style={[styles.button, cart.items.length === 0 && { opacity: 0.5 }]}
      >
        <Text style={styles.buttonText}>Checkout</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  empty: { padding: 24, color: Colors.textSecondary },
  line: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    gap: 6,
  },
  name: { fontWeight: "700" },
  qtyRow: { flexDirection: "row", gap: 16 },
  qtyBtn: { fontSize: 22, fontWeight: "800", color: Colors.accent },
  total: { fontSize: 18, fontWeight: "800", marginTop: 8 },
  button: {
    backgroundColor: Colors.accent,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  buttonText: { color: Colors.inverse, fontWeight: "800" },
});
