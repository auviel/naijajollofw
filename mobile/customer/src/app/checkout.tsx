import { AddressField } from "@/components/address-field";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { rememberOrder } from "@/lib/recent-orders";
import { isSquareIapAvailable, tokenizeCardInApp } from "@/lib/square-pay";
import { loadCartSid } from "@/lib/storage";
import { openStorefront } from "@/lib/storefront";
import {
  computePreviewTotals,
  parseTipDollarsToCents,
  TIP_PERCENTS,
  tipCentsFromPercent,
  type TipPercent,
} from "@/lib/tip";
import { randomUuid } from "@/lib/uuid";
import { Button, Card, Colors, Field, Radii, Screen, Type } from "@naijajollof/ui";
import {
  formatCadFromCents,
  type CheckoutConfig,
  type DinerAddress,
  type GeocodedAddress,
  type PublicOrderView,
} from "@naijajollof/api-types";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function CheckoutScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { cart, refresh } = useCart();
  const [config, setConfig] = useState<CheckoutConfig | null>(null);
  const [savedAddresses, setSavedAddresses] = useState<DinerAddress[]>([]);
  const [fulfillment, setFulfillment] = useState<"pickup" | "delivery">("pickup");
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(user?.phoneE164 ?? "");
  const [notes, setNotes] = useState("");
  const [address, setAddress] = useState("");
  const [addressUnit, setAddressUnit] = useState("");
  const [geocoded, setGeocoded] = useState<GeocodedAddress | null>(null);
  const [scheduledFor, setScheduledFor] = useState<string | null>(null);
  const [tipPercent, setTipPercent] = useState<TipPercent | "custom">(0);
  const [customTip, setCustomTip] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const idempotencyKeyRef = useRef<string | null>(null);

  const tipCents =
    tipPercent === "custom"
      ? parseTipDollarsToCents(customTip)
      : tipCentsFromPercent(cart.subtotalCents, tipPercent);

  const cartFingerprint = `${cart.id ?? "anon"}:${cart.subtotalCents}:${cart.items
    .map((line) => `${line.id}:${line.quantity}`)
    .join(",")}:${tipCents}:${fulfillment}`;

  useEffect(() => {
    idempotencyKeyRef.current = null;
  }, [cartFingerprint]);

  useEffect(() => {
    apiFetch<CheckoutConfig>("/api/checkout/config")
      .then(setConfig)
      .catch(() => undefined);
  }, [cart.itemCount, cart.subtotalCents]);

  useEffect(() => {
    if (!user) return;
    void apiFetch<DinerAddress[]>("/api/diner/addresses")
      .then(setSavedAddresses)
      .catch(() => setSavedAddresses([]));
  }, [user]);

  useEffect(() => {
    if (user?.name && !name) setName(user.name);
    if (user?.email && !email) setEmail(user.email);
    if (user?.phoneE164 && !phone) setPhone(user.phoneE164);
  }, [user, name, email, phone]);

  useEffect(() => {
    if (fulfillment !== "delivery" || address || savedAddresses.length === 0) {
      return;
    }
    const primary = savedAddresses.find((item) => item.isDefault) ?? savedAddresses[0];
    if (!primary) return;
    setAddress(primary.formatted);
    setAddressUnit(primary.line2 ?? "");
  }, [address, fulfillment, savedAddresses]);

  const mustSchedule = Boolean(config && !config.openStatus?.isOpen);
  const simulate = Boolean(config?.simulatePayments);
  const squareReady = Boolean(config?.configured && config.applicationId);
  const iapAvailable = isSquareIapAvailable();
  const preview = useMemo(() => {
    const taxRateBps = config?.taxRateBps ?? 1300;
    return computePreviewTotals(cart.subtotalCents, tipCents, taxRateBps);
  }, [cart.subtotalCents, config?.taxRateBps, tipCents]);

  const selectedSlotLabel = useMemo(() => {
    if (!scheduledFor || !config) return null;
    for (const day of config.schedule.options) {
      const slot = day.slots.find((item) => item.startAt === scheduledFor);
      if (slot) return `${day.shortLabel} · ${slot.label}`;
    }
    return null;
  }, [config, scheduledFor]);

  async function openWebsiteCheckout() {
    const sid = await loadCartSid();
    await openStorefront("/checkout", {
      cartSid: sid,
      fulfillment,
      tipCents: tipCents > 0 ? tipCents : undefined,
    });
    await refresh();
  }

  async function placeOrder(sourceId?: string) {
    if (mustSchedule && !scheduledFor) {
      setError(
        fulfillment === "delivery"
          ? "Choose a delivery time — the kitchen is closed right now."
          : "Choose a pickup time — the kitchen is closed right now.",
      );
      return;
    }
    if (fulfillment === "delivery") {
      if (!geocoded || geocoded.confidence === "low") {
        setError("Confirm a valid delivery address before paying.");
        return;
      }
    }

    const order = await apiFetch<PublicOrderView>("/api/checkout", {
      method: "POST",
      body: JSON.stringify({
        sourceId,
        idempotencyKey: (idempotencyKeyRef.current ??= randomUuid()),
        customerName: name.trim(),
        customerEmail: email.trim(),
        customerPhone: phone.trim(),
        fulfillmentType: fulfillment,
        tipCents,
        notes: notes.trim() || undefined,
        scheduledFor: scheduledFor ?? undefined,
        dropoffAddress:
          fulfillment === "delivery" ? address.trim() : undefined,
        dropoffUnit:
          fulfillment === "delivery"
            ? addressUnit.trim() || undefined
            : undefined,
        dropoffLat:
          fulfillment === "delivery" ? geocoded?.address.latitude : undefined,
        dropoffLng:
          fulfillment === "delivery" ? geocoded?.address.longitude : undefined,
      }),
    });
    await rememberOrder(order);
    await refresh();
    router.replace(`/orders/${order.id}?token=${order.publicToken}`);
  }

  async function onPay() {
    setBusy(true);
    setError(null);
    try {
      if (simulate) {
        await placeOrder();
        return;
      }
      if (squareReady && config?.applicationId && iapAvailable) {
        const nonce = await tokenizeCardInApp(config.applicationId);
        if (!nonce) return;
        await placeOrder(nonce);
        return;
      }
      await openWebsiteCheckout();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
    } finally {
      setBusy(false);
    }
  }

  if (cart.items.length === 0) {
    return (
      <Screen>
        <View style={styles.content}>
          <Text style={Type.meta}>Your cart is empty.</Text>
          <Button label="Back to menu" onPress={() => router.replace("/")} />
        </View>
      </Screen>
    );
  }

  const payDisabled =
    busy ||
    !name.trim() ||
    !email.trim() ||
    !phone.trim() ||
    (fulfillment === "delivery" && (!geocoded || geocoded.confidence === "low"));

  const payLabel = busy
    ? "Placing…"
    : simulate
      ? `Place ${fulfillment} order · ${formatCadFromCents(preview.totalCents)}`
      : iapAvailable && squareReady
        ? `Pay ${formatCadFromCents(preview.totalCents)}`
        : `Pay on website · ${formatCadFromCents(preview.totalCents)}`;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        {config ? (
          <View style={[styles.hours, !config.openStatus.isOpen && styles.hoursClosed]}>
            <Text style={styles.hoursText}>{config.openStatus.message}</Text>
          </View>
        ) : null}

        <Card style={{ gap: 8 }}>
          <Row label="Subtotal" value={formatCadFromCents(preview.subtotalCents)} />
          {preview.tipCents > 0 ? (
            <Row label="Tip" value={formatCadFromCents(preview.tipCents)} />
          ) : null}
          <Row label="HST" value={formatCadFromCents(preview.taxCents)} />
          <Row label="Total" value={formatCadFromCents(preview.totalCents)} bold />
        </Card>

        <Text style={Type.headline}>How do you want it?</Text>
        <View style={styles.fulfillmentRow}>
          {(["pickup", "delivery"] as const).map((value) => {
            const on = fulfillment === value;
            return (
              <Pressable
                key={value}
                onPress={() => setFulfillment(value)}
                style={[styles.fulfillment, on && styles.fulfillmentOn]}
              >
                <Text style={[styles.fulfillmentText, on && styles.fulfillmentTextOn]}>
                  {value === "pickup" ? "Pickup" : "Delivery"}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.schedule}>
          <Text style={Type.headline}>Tip</Text>
          <Text style={Type.meta}>Goes to the kitchen. Tax is on food only.</Text>
          <View style={styles.slotRow}>
            {TIP_PERCENTS.map((percent) => {
              const on = tipPercent === percent;
              const amount =
                percent === 0
                  ? "No tip"
                  : `${percent}% · ${formatCadFromCents(tipCentsFromPercent(cart.subtotalCents, percent))}`;
              return (
                <Pressable
                  key={percent}
                  onPress={() => setTipPercent(percent)}
                  style={[styles.slot, on && styles.slotOn]}
                >
                  <Text style={[styles.slotText, on && styles.slotTextOn]}>{amount}</Text>
                </Pressable>
              );
            })}
            <Pressable
              onPress={() => setTipPercent("custom")}
              style={[styles.slot, tipPercent === "custom" && styles.slotOn]}
            >
              <Text
                style={[styles.slotText, tipPercent === "custom" && styles.slotTextOn]}
              >
                Custom
              </Text>
            </Pressable>
          </View>
          {tipPercent === "custom" ? (
            <Field
              placeholder="Custom tip (CAD)"
              keyboardType="decimal-pad"
              value={customTip}
              onChangeText={setCustomTip}
            />
          ) : null}
        </View>

        <Text style={Type.headline}>
          {fulfillment === "delivery" ? "Delivery details" : "Pickup details"}
        </Text>
        <Field placeholder="Name" value={name} onChangeText={setName} />
        <Field
          placeholder="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <Field
          placeholder="Phone"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
        />

        {fulfillment === "delivery" ? (
          <>
            {savedAddresses.length > 0 ? (
              <View style={styles.slotRow}>
                {savedAddresses.map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => {
                      setAddress(item.formatted);
                      setAddressUnit(item.line2 ?? "");
                    }}
                    style={[
                      styles.slot,
                      address === item.formatted && styles.slotOn,
                    ]}
                  >
                    <Text
                      style={[
                        styles.slotText,
                        address === item.formatted && styles.slotTextOn,
                      ]}
                    >
                      {item.label || item.formatted}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
            <AddressField value={address} onChange={setAddress} onGeocoded={setGeocoded} />
            <Field
              placeholder="Apt / unit (optional)"
              value={addressUnit}
              onChangeText={setAddressUnit}
            />
          </>
        ) : null}

        <Field
          placeholder="Kitchen notes (optional)"
          value={notes}
          onChangeText={setNotes}
        />

        {config && (mustSchedule || config.schedule.options.length > 0) ? (
          <View style={styles.schedule}>
            <Text style={Type.headline}>
              {mustSchedule
                ? fulfillment === "delivery"
                  ? "Choose delivery time"
                  : "Choose pickup time"
                : "Schedule (optional)"}
            </Text>
            {selectedSlotLabel ? (
              <Text style={Type.meta}>Selected: {selectedSlotLabel}</Text>
            ) : null}
            {config.schedule.options.map((day) => (
              <View key={day.dateKey} style={styles.dayBlock}>
                <Text style={styles.dayLabel}>{day.label}</Text>
                <View style={styles.slotRow}>
                  {day.slots.map((slot) => {
                    const on = scheduledFor === slot.startAt;
                    return (
                      <Pressable
                        key={slot.startAt}
                        onPress={() =>
                          setScheduledFor(on && !mustSchedule ? null : slot.startAt)
                        }
                        style={[styles.slot, on && styles.slotOn]}
                      >
                        <Text style={[styles.slotText, on && styles.slotTextOn]}>
                          {slot.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button disabled={payDisabled} label={payLabel} onPress={() => void onPay()} />

        {simulate ? (
          <Text style={Type.meta}>Simulate payments is on — no card charge locally.</Text>
        ) : iapAvailable && squareReady ? (
          <Text style={Type.meta}>Card entry uses Square In-App Payments on this build.</Text>
        ) : (
          <Text style={Type.meta}>
            Live card pay opens the website until you run a development build with
            Square In-App Payments.
          </Text>
        )}
      </ScrollView>
    </Screen>
  );
}

function Row({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, bold && styles.bold]}>{label}</Text>
      <Text style={[styles.rowValue, bold && styles.bold]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 12, paddingBottom: 48 },
  hours: {
    backgroundColor: Colors.successSoft,
    borderRadius: Radii.md,
    padding: 12,
  },
  hoursClosed: { backgroundColor: Colors.dangerSoft },
  hoursText: { fontWeight: "700" },
  row: { flexDirection: "row", justifyContent: "space-between" },
  rowLabel: { color: Colors.textSecondary },
  rowValue: { fontWeight: "600" },
  bold: { fontWeight: "800", color: Colors.text },
  error: { color: Colors.danger },
  schedule: { gap: 10 },
  dayBlock: { gap: 8 },
  dayLabel: { fontWeight: "700" },
  slotRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  slot: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: Colors.surface,
    minHeight: 40,
    justifyContent: "center",
    maxWidth: "100%",
  },
  slotOn: { borderColor: Colors.accent, backgroundColor: Colors.accentSoft },
  slotText: { fontSize: 12, fontWeight: "600" },
  slotTextOn: { color: Colors.accent },
  fulfillmentRow: { flexDirection: "row", gap: 8 },
  fulfillment: {
    flex: 1,
    minHeight: 48,
    borderRadius: Radii.button,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  fulfillmentOn: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accent,
  },
  fulfillmentText: { fontWeight: "800", color: Colors.text },
  fulfillmentTextOn: { color: Colors.inverse },
});
