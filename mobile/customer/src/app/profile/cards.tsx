import { apiFetch } from "@/lib/api";
import { isSquareIapAvailable, tokenizeCardInApp } from "@/lib/square-pay";
import { openStorefront } from "@/lib/storefront";
import { randomUuid } from "@/lib/uuid";
import { Button, Card, Colors, Screen, Type } from "@naijajollof/ui";
import type { CheckoutConfig, DinerPaymentState } from "@naijajollof/api-types";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

export default function CardsScreen() {
  const [state, setState] = useState<DinerPaymentState | null>(null);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [payment, config] = await Promise.all([
      apiFetch<DinerPaymentState>("/api/diner/cards"),
      apiFetch<CheckoutConfig>("/api/checkout/config"),
    ]);
    setState(payment);
    setApplicationId(config.applicationId);
  }, []);

  useEffect(() => {
    void load().catch((err: unknown) =>
      setError(err instanceof Error ? err.message : "Could not load cards"),
    );
  }, [load]);

  async function addCard() {
    setBusy(true);
    setError(null);
    try {
      if (!applicationId || !isSquareIapAvailable()) {
        await openStorefront("/account/payment");
        return;
      }
      const nonce = await tokenizeCardInApp(applicationId);
      if (!nonce) return;
      await apiFetch("/api/diner/cards", {
        method: "POST",
        body: JSON.stringify({
          sourceId: nonce,
          idempotencyKey: randomUuid(),
        }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add card");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.wrap}>
        <Text style={Type.display}>Payment methods</Text>
        {state && !state.available ? (
          <Text style={Type.meta}>
            Saved cards are unavailable until Square is configured.
          </Text>
        ) : null}
        {(state?.cards ?? []).map((card) => (
          <Card key={card.id} style={{ gap: 8 }}>
            <View style={styles.cardTop}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.title}>
                  {(card.brand ?? "Card").toUpperCase()} ···· {card.last4 ?? "••••"}
                </Text>
                <Text style={Type.meta}>
                  Exp {card.expMonth ?? "—"}/{card.expYear ?? "—"}
                </Text>
              </View>
              <Pressable
                accessibilityLabel="Remove card"
                hitSlop={8}
                onPress={() => {
                  void apiFetch(`/api/diner/cards/${card.id}`, { method: "DELETE" })
                    .then(load)
                    .catch((err: unknown) =>
                      Alert.alert(
                        "Cards",
                        err instanceof Error ? err.message : "Could not remove card",
                      ),
                    );
                }}
                style={styles.iconBtn}
              >
                <Ionicons name="close" size={20} color={Colors.textSecondary} />
              </Pressable>
            </View>
          </Card>
        ))}
        {error ? <Text style={styles.err}>{error}</Text> : null}
        <Button
          disabled={busy}
          label={
            busy
              ? "Working…"
              : isSquareIapAvailable()
                ? "Add card"
                : "Manage cards on website"
          }
          onPress={() => void addCard()}
        />
        {!isSquareIapAvailable() ? (
          <Text style={Type.meta}>
            Adding a card in-app needs a development build with Square In-App Payments.
          </Text>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 20, gap: 12, paddingBottom: 40 },
  title: { fontWeight: "800", fontSize: 16, color: Colors.text },
  err: { color: Colors.danger },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
});
