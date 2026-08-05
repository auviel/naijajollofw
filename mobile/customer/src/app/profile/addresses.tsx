import { AddressField } from "@/components/address-field";
import { apiFetch } from "@/lib/api";
import { Button, Card, Colors, Field, Screen, Type } from "@naijajollof/ui";
import type { DinerAddress, GeocodedAddress } from "@naijajollof/api-types";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

export default function AddressesScreen() {
  const [addresses, setAddresses] = useState<DinerAddress[]>([]);
  const [label, setLabel] = useState("Home");
  const [formatted, setFormatted] = useState("");
  const [unit, setUnit] = useState("");
  const [geocoded, setGeocoded] = useState<GeocodedAddress | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const data = await apiFetch<DinerAddress[]>("/api/diner/addresses");
    setAddresses(data);
  }, []);

  useEffect(() => {
    void load().catch((err: unknown) =>
      setError(err instanceof Error ? err.message : "Could not load addresses"),
    );
  }, [load]);

  async function addAddress() {
    if (!geocoded) {
      setError("Confirm a valid address first.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await apiFetch("/api/diner/addresses", {
        method: "POST",
        body: JSON.stringify({
          line1: geocoded.address.line1,
          line2: unit.trim() || geocoded.address.line2 || null,
          city: geocoded.address.city,
          province: geocoded.address.province,
          postalCode: geocoded.address.postalCode,
          country: geocoded.address.country || "CA",
          latitude: geocoded.address.latitude,
          longitude: geocoded.address.longitude,
          formatted: geocoded.address.formatted,
          label: label.trim() || null,
          isDefault: addresses.length === 0,
        }),
      });
      setFormatted("");
      setUnit("");
      setGeocoded(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save address");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.wrap}>
        <Text style={Type.display}>Addresses</Text>
        {addresses.map((item) => (
          <Card key={item.id} style={{ gap: 8 }}>
            <View style={styles.cardTop}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.title}>{item.label || "Saved address"}</Text>
                <Text style={Type.meta}>{item.formatted}</Text>
                {item.isDefault ? <Text style={styles.ok}>Default</Text> : null}
              </View>
              <Pressable
                accessibilityLabel="Remove address"
                hitSlop={8}
                onPress={() => {
                  void apiFetch(`/api/diner/addresses/${item.id}`, {
                    method: "DELETE",
                  })
                    .then(load)
                    .catch((err: unknown) =>
                      Alert.alert(
                        "Address",
                        err instanceof Error ? err.message : "Could not delete",
                      ),
                    );
                }}
                style={styles.iconBtn}
              >
                <Ionicons name="close" size={20} color={Colors.textSecondary} />
              </Pressable>
            </View>
            {!item.isDefault ? (
              <Pressable
                onPress={() => {
                  void apiFetch(`/api/diner/addresses/${item.id}`, {
                    method: "PATCH",
                    body: JSON.stringify({ isDefault: true }),
                  })
                    .then(load)
                    .catch((err: unknown) =>
                      Alert.alert(
                        "Address",
                        err instanceof Error ? err.message : "Could not update",
                      ),
                    );
                }}
              >
                <Text style={styles.link}>Make default</Text>
              </Pressable>
            ) : null}
          </Card>
        ))}

        <Text style={Type.headline}>Add address</Text>
        <Field placeholder="Label (Home, Work…)" value={label} onChangeText={setLabel} />
        <AddressField value={formatted} onChange={setFormatted} onGeocoded={setGeocoded} />
        <Field placeholder="Apt / unit (optional)" value={unit} onChangeText={setUnit} />
        {error ? <Text style={styles.err}>{error}</Text> : null}
        <Button
          disabled={busy || !geocoded}
          label={busy ? "Saving…" : "Save address"}
          onPress={() => void addAddress()}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 20, gap: 12, paddingBottom: 40 },
  title: { fontWeight: "800", fontSize: 16, color: Colors.text },
  ok: { color: Colors.success, fontWeight: "700" },
  err: { color: Colors.danger },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  link: { color: Colors.accent, fontWeight: "700" },
});
