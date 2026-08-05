import { Colors } from "@/constants/theme";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { registerDinerPushDevice } from "@/lib/push";
import { formatCadFromCents, type PublicOrderView } from "@naijajollof/api-types";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

export default function AccountScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<PublicOrderView[]>([]);

  useEffect(() => {
    if (!user) return;
    apiFetch<PublicOrderView[]>("/api/diner/orders").then(setOrders).catch(() => undefined);
  }, [user]);

  if (!user) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.meta}>Sign in to see order history and enable push updates.</Text>
        <Pressable style={styles.button} onPress={() => router.push("/login")}>
          <Text style={styles.buttonText}>Sign in</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Text style={styles.name}>{user.name}</Text>
      <Text style={styles.meta}>{user.email}</Text>
      <Pressable style={styles.secondary} onPress={() => void registerDinerPushDevice()}>
        <Text style={styles.secondaryText}>Enable order notifications</Text>
      </Pressable>
      <Text style={styles.section}>Orders</Text>
      {orders.length === 0 ? (
        <Text style={styles.meta}>No orders yet.</Text>
      ) : (
        orders.map((order) => (
          <Pressable
            key={order.id}
            style={styles.order}
            onPress={() =>
              router.push(`/orders/${order.id}?token=${order.publicToken}`)
            }
          >
            <Text style={styles.orderTitle}>
              {order.displayNumber ?? order.statusMessage}
            </Text>
            <Text style={styles.meta}>
              {formatCadFromCents(order.totalCents)} · {order.statusMessage}
            </Text>
          </Pressable>
        ))
      )}
      <Pressable style={styles.button} onPress={() => void signOut()}>
        <Text style={styles.buttonText}>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 16, gap: 10 },
  name: { fontSize: 24, fontWeight: "800" },
  meta: { color: Colors.textSecondary },
  section: { marginTop: 16, fontWeight: "800", fontSize: 18 },
  order: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
  },
  orderTitle: { fontWeight: "700" },
  secondary: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: Colors.surface,
  },
  secondaryText: { fontWeight: "700" },
  button: {
    marginTop: 12,
    backgroundColor: Colors.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonText: { color: Colors.inverse, fontWeight: "800" },
});
