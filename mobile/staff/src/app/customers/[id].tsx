import { StackScroll } from "@/components/kitchen/stack-scroll";
import { apiFetch } from "@/lib/api";
import { KType } from "@/lib/kitchen/typography";
import {
  formatCadFromCents,
  type StaffOrderListItem,
} from "@naijajollof/api-types";
import {
  Button,
  Card,
  Colors,
  Field,
  KitchenTicketSkeleton,
  Screen,
} from "@naijajollof/ui";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type CustomerDetailPayload = {
  id: string;
  name: string;
  notes: string | null;
  phones: Array<{
    id: string;
    phoneE164: string;
    label: string | null;
    isPrimary: boolean;
  }>;
  addresses: Array<{
    id: string;
    formatted: string;
    isPrimary: boolean;
  }>;
  orderCount: number;
  deliveryCount: number;
  recentOrders: StaffOrderListItem[];
};

function ticketLabel(order: StaffOrderListItem): string {
  return (
    order.displayNumber ??
    (order.dayTicket ? `#${order.dayTicket}` : "Order")
  );
}

function formatPhone(phoneE164: string): string {
  const digits = phoneE164.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    const local = digits.slice(1);
    return `(${local.slice(0, 3)}) ${local.slice(3, 6)}-${local.slice(6)}`;
  }
  return phoneE164;
}

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [customer, setCustomer] = useState<CustomerDetailPayload | null>(null);
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    if (!id || typeof id !== "string") return;
    try {
      const data = await apiFetch<CustomerDetailPayload>(
        `/api/customers/${id}`,
      );
      setCustomer(data);
      setName(data.name);
      setNotes(data.notes ?? "");
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load customer");
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: customer?.name ?? "Customer",
    });
  }, [navigation, customer?.name]);

  const dirty =
    customer != null &&
    (name.trim() !== customer.name ||
      (notes.trim() || null) !== (customer.notes ?? null));

  async function onSave() {
    if (!customer || !name.trim()) {
      setError("Enter the customer name.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const updated = await apiFetch<CustomerDetailPayload>(
        `/api/customers/${customer.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            name: name.trim(),
            notes: notes.trim() || null,
          }),
        },
      );
      setCustomer((prev) =>
        prev
          ? {
              ...prev,
              name: updated.name,
              notes: updated.notes,
            }
          : prev,
      );
      setName(updated.name);
      setNotes(updated.notes ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete() {
    if (!customer) return;
    Alert.alert(
      "Delete customer?",
      "Orders stay in history; this removes the CRM profile.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => void onDelete(),
        },
      ],
    );
  }

  async function onDelete() {
    if (!customer) return;
    setDeleting(true);
    setError(null);
    try {
      await apiFetch<{ ok: boolean }>(`/api/customers/${customer.id}`, {
        method: "DELETE",
      });
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete");
      setDeleting(false);
    }
  }

  if (!customer && !error) {
    return (
      <Screen>
        <StackScroll>
          <KitchenTicketSkeleton />
        </StackScroll>
      </Screen>
    );
  }

  if (error && !customer) {
    return (
      <Screen>
        <Text style={[styles.error, { margin: 20 }]}>{error}</Text>
      </Screen>
    );
  }

  if (!customer) return null;

  return (
    <Screen>
      <StackScroll>
        <Text style={KType.meta}>
          {customer.orderCount} orders
          {customer.deliveryCount > 0
            ? ` · ${customer.deliveryCount} deliveries`
            : ""}
        </Text>

        <Card style={styles.card}>
          <Text style={KType.kicker}>Profile</Text>
          <Text style={styles.label}>Name</Text>
          <Field value={name} onChangeText={setName} autoCapitalize="words" />
          <Text style={styles.label}>Notes</Text>
          <Field
            value={notes}
            onChangeText={setNotes}
            placeholder="Kitchen notes"
            multiline
            style={styles.notes}
          />

          <View style={styles.divider} />
          <Text style={KType.kicker}>Phones</Text>
          {customer.phones.length === 0 ? (
            <Text style={KType.meta}>None on file</Text>
          ) : (
            customer.phones.map((phone) => (
              <Text key={phone.id} style={KType.body}>
                {formatPhone(phone.phoneE164)}
                {phone.isPrimary ? " · primary" : ""}
              </Text>
            ))
          )}

          <View style={styles.divider} />
          <Text style={KType.kicker}>Addresses</Text>
          {customer.addresses.length === 0 ? (
            <Text style={KType.meta}>None on file</Text>
          ) : (
            customer.addresses.map((address) => (
              <Text key={address.id} style={KType.body}>
                {address.formatted}
                {address.isPrimary ? " · primary" : ""}
              </Text>
            ))
          )}
        </Card>

        <View style={styles.past}>
          <Text style={KType.kicker}>Past orders</Text>
          {customer.recentOrders.length === 0 ? (
            <Text style={KType.meta}>No linked orders yet.</Text>
          ) : (
            <View style={styles.orderList}>
              {customer.recentOrders.map((order) => (
                <Pressable
                  key={order.id}
                  onPress={() => router.push(`/orders/${order.id}`)}
                >
                  <Card style={styles.orderRow}>
                    <View style={styles.orderTop}>
                      <Text style={KType.bodyStrong}>{ticketLabel(order)}</Text>
                      <Text style={KType.numeric}>
                        {formatCadFromCents(order.totalCents)}
                      </Text>
                    </View>
                    <Text style={KType.meta}>
                      {order.status.replaceAll("_", " ")}
                      {" · "}
                      {order.fulfillmentType === "delivery"
                        ? "Delivery"
                        : "Pickup"}
                    </Text>
                  </Card>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button
          label={deleting ? "Deleting…" : "Delete customer"}
          variant="danger"
          onPress={confirmDelete}
          disabled={deleting || saving}
        />
      </StackScroll>

      {dirty ? (
        <View
          style={[
            styles.footer,
            { paddingBottom: Math.max(insets.bottom, 12) },
          ]}
        >
          <Button
            label={saving ? "Saving…" : "Save changes"}
            onPress={() => void onSave()}
            disabled={saving}
          />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { gap: 8 },
  label: { ...KType.metaStrong, marginTop: 4 },
  notes: { minHeight: 88, textAlignVertical: "top", paddingTop: 12 },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
    marginVertical: 6,
  },
  past: { gap: 10, marginTop: 4 },
  orderList: { gap: 8 },
  orderRow: { gap: 4 },
  orderTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  error: { ...KType.metaStrong, color: Colors.danger },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
});
