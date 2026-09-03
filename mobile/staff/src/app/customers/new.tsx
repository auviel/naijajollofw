import { StackScroll } from "@/components/kitchen/stack-scroll";
import { apiFetch } from "@/lib/api";
import { KType } from "@/lib/kitchen/typography";
import {
  Button,
  Card,
  Colors,
  Field,
  Screen,
} from "@naijajollof/ui";
import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function NewCustomerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSave() {
    if (!name.trim()) {
      setError("Enter the customer name.");
      return;
    }
    if (!phone.trim()) {
      setError("Enter a phone number.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const body: { name: string; phone: string; address?: string } = {
        name: name.trim(),
        phone: phone.trim(),
      };
      if (address.trim()) body.address = address.trim();

      const created = await apiFetch<{ id: string }>("/api/customers", {
        method: "POST",
        body: JSON.stringify(body),
      });
      router.replace(`/customers/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create customer");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <StackScroll>
        <Text style={KType.meta}>
          Name and phone are required. Address is optional — add it when you
          have a delivery dropoff.
        </Text>

        <Card style={styles.card}>
          <Text style={KType.kicker}>Customer</Text>
          <View style={styles.fieldBlock}>
            <Text style={KType.meta}>Name</Text>
            <Field
              value={name}
              onChangeText={setName}
              placeholder="Customer name"
              autoCapitalize="words"
            />
          </View>
          <View style={styles.fieldBlock}>
            <Text style={KType.meta}>Phone</Text>
            <Field
              value={phone}
              onChangeText={setPhone}
              placeholder="(519) 555-0100"
              keyboardType="phone-pad"
              autoCapitalize="none"
            />
          </View>
          <View style={styles.fieldBlock}>
            <Text style={KType.meta}>Address (optional)</Text>
            <Field
              value={address}
              onChangeText={setAddress}
              placeholder="Street, city, postal code"
              autoCapitalize="words"
            />
          </View>
        </Card>

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </StackScroll>

      <View
        style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}
      >
        <Button
          label={saving ? "Saving…" : "Create customer"}
          onPress={() => void onSave()}
          disabled={saving}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12 },
  fieldBlock: { gap: 6 },
  error: { ...KType.metaStrong, color: Colors.danger },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
});
