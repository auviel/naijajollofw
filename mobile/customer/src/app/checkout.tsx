import { Colors } from "@/constants/theme";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatCadFromCents, type PublicOrderView } from "@naijajollof/api-types";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

function randomUuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const rand = (Math.random() * 16) | 0;
    const value = char === "x" ? rand : (rand & 0x3) | 0x8;
    return value.toString(16);
  });
}

type CheckoutConfig = {
  simulatePayments: boolean;
  configured: boolean;
  mobilePayments: { sourceIdFromInAppSdk: boolean; currency: string };
  preview: { totalCents: number; taxCents: number; subtotalCents: number };
};

export default function CheckoutScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [config, setConfig] = useState<CheckoutConfig | null>(null);
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(user?.phoneE164 ?? "");
  const [fulfillment, setFulfillment] = useState<"pickup" | "delivery">("pickup");
  const [sourceId, setSourceId] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    apiFetch<CheckoutConfig>("/api/checkout/config").then(setConfig).catch(() => undefined);
  }, []);

  async function pay() {
    setBusy(true);
    try {
      const order = await apiFetch<PublicOrderView>("/api/checkout", {
        method: "POST",
        body: JSON.stringify({
          idempotencyKey: randomUuid(),
          customerName: name.trim(),
          customerEmail: email.trim(),
          customerPhone: phone.trim(),
          fulfillmentType: fulfillment,
          tipCents: 0,
          ...(sourceId.trim() ? { sourceId: sourceId.trim() } : {}),
        }),
      });
      router.replace(`/orders/${order.id}?token=${order.publicToken}`);
    } catch (err) {
      Alert.alert("Checkout failed", err instanceof Error ? err.message : "Try again");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.help}>
        Square In-App Payments SDK should tokenize the card and send `sourceId` here.
        {config?.simulatePayments
          ? " Simulate mode is on — sourceId can be omitted locally."
          : " Production charges require a Square sourceId."}
      </Text>
      {config ? (
        <Text style={styles.total}>
          Due {formatCadFromCents(config.preview.totalCents)} (incl. tax)
        </Text>
      ) : null}

      <View style={styles.row}>
        <Pressable
          onPress={() => setFulfillment("pickup")}
          style={[styles.chip, fulfillment === "pickup" && styles.chipOn]}
        >
          <Text>Pickup</Text>
        </Pressable>
        <Pressable
          onPress={() => setFulfillment("delivery")}
          style={[styles.chip, fulfillment === "delivery" && styles.chipOn]}
        >
          <Text>Delivery</Text>
        </Pressable>
      </View>
      {fulfillment === "delivery" ? (
        <Text style={styles.help}>
          Delivery checkout in v1 is on the website (address + geocode). Use pickup in the app for now.
        </Text>
      ) : null}

      <TextInput style={styles.input} placeholder="Name" value={name} onChangeText={setName} />
      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Phone (+1…)"
        keyboardType="phone-pad"
        value={phone}
        onChangeText={setPhone}
      />
      <TextInput
        style={styles.input}
        placeholder="Square sourceId (In-App Payments nonce)"
        autoCapitalize="none"
        value={sourceId}
        onChangeText={setSourceId}
      />

      <Pressable
        disabled={busy || !name || !email || !phone || fulfillment === "delivery"}
        onPress={() => void pay()}
        style={[
          styles.button,
          (busy || fulfillment === "delivery") && { opacity: 0.5 },
        ]}
      >
        <Text style={styles.buttonText}>{busy ? "Placing…" : "Place order"}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  help: { color: Colors.textSecondary },
  total: { fontSize: 20, fontWeight: "800" },
  row: { flexDirection: "row", gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipOn: { borderColor: Colors.accent, backgroundColor: "#fff1e8" },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 12,
    backgroundColor: Colors.surface,
  },
  button: {
    backgroundColor: Colors.accent,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  buttonText: { color: Colors.inverse, fontWeight: "800" },
});
