import { StackScroll } from "@/components/kitchen/stack-scroll";
import { MapsLink, TelLink } from "@/components/kitchen/contact-links";
import { IconBtn } from "@/components/kitchen/icon-btn";
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
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type PhoneRow = {
  id: string;
  phoneE164: string;
  label: string | null;
  isPrimary: boolean;
};

type AddressRow = {
  id: string;
  formatted: string;
  isPrimary: boolean;
};

type CustomerDetailPayload = {
  id: string;
  name: string;
  notes: string | null;
  phones: PhoneRow[];
  addresses: AddressRow[];
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
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [contactBusy, setContactBusy] = useState(false);

  const [phoneDraftId, setPhoneDraftId] = useState<string | "new" | null>(null);
  const [phoneDraft, setPhoneDraft] = useState("");
  const [addressDraftId, setAddressDraftId] = useState<string | "new" | null>(
    null,
  );
  const [addressDraft, setAddressDraft] = useState("");

  const applyCustomer = useCallback((data: CustomerDetailPayload) => {
    setCustomer(data);
    setName(data.name);
    setNotes(data.notes ?? "");
  }, []);

  const load = useCallback(async () => {
    if (!id || typeof id !== "string") return;
    try {
      const data = await apiFetch<CustomerDetailPayload>(
        `/api/customers/${id}`,
      );
      applyCustomer(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load customer");
    }
  }, [applyCustomer, id]);

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
      applyCustomer({
        ...customer,
        name: updated.name,
        notes: updated.notes,
      });
      setEditing(false);
      clearContactDrafts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  function clearContactDrafts() {
    setPhoneDraftId(null);
    setPhoneDraft("");
    setAddressDraftId(null);
    setAddressDraft("");
  }

  function cancelEdit() {
    if (!customer) return;
    setName(customer.name);
    setNotes(customer.notes ?? "");
    setError(null);
    setEditing(false);
    clearContactDrafts();
  }

  function startEdit() {
    setEditing(true);
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

  async function refreshFromContactMutation(
    path: string,
    init: RequestInit,
  ) {
    if (!customer) return;
    setContactBusy(true);
    setError(null);
    try {
      const updated = await apiFetch<CustomerDetailPayload>(path, init);
      applyCustomer({
        ...updated,
        recentOrders: customer.recentOrders,
        orderCount: customer.orderCount,
        deliveryCount: customer.deliveryCount,
      });
      clearContactDrafts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update contact");
    } finally {
      setContactBusy(false);
    }
  }

  function startAddPhone() {
    setPhoneDraftId("new");
    setPhoneDraft("");
  }

  function startEditPhone(phone: PhoneRow) {
    setPhoneDraftId(phone.id);
    setPhoneDraft(formatPhone(phone.phoneE164));
  }

  async function commitPhoneDraft() {
    if (!customer || !phoneDraft.trim()) {
      setError("Enter a phone number.");
      return;
    }
    if (phoneDraftId === "new") {
      await refreshFromContactMutation(`/api/customers/${customer.id}/phones`, {
        method: "POST",
        body: JSON.stringify({ phone: phoneDraft.trim() }),
      });
      return;
    }
    if (phoneDraftId) {
      await refreshFromContactMutation(
        `/api/customers/${customer.id}/phones/${phoneDraftId}`,
        {
          method: "PATCH",
          body: JSON.stringify({ phone: phoneDraft.trim() }),
        },
      );
    }
  }

  function confirmDeletePhone(phone: PhoneRow) {
    if (!customer) return;
    if (customer.phones.length <= 1) {
      setError("Keep at least one phone on the customer.");
      return;
    }
    Alert.alert("Remove phone?", formatPhone(phone.phoneE164), [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () =>
          void refreshFromContactMutation(
            `/api/customers/${customer.id}/phones/${phone.id}`,
            { method: "DELETE" },
          ),
      },
    ]);
  }

  function startAddAddress() {
    setAddressDraftId("new");
    setAddressDraft("");
  }

  function startEditAddress(address: AddressRow) {
    setAddressDraftId(address.id);
    setAddressDraft(address.formatted);
  }

  async function commitAddressDraft() {
    if (!customer || !addressDraft.trim()) {
      setError("Enter an address.");
      return;
    }
    if (addressDraftId === "new") {
      await refreshFromContactMutation(
        `/api/customers/${customer.id}/addresses`,
        {
          method: "POST",
          body: JSON.stringify({ address: addressDraft.trim() }),
        },
      );
      return;
    }
    if (addressDraftId) {
      await refreshFromContactMutation(
        `/api/customers/${customer.id}/addresses/${addressDraftId}`,
        {
          method: "PATCH",
          body: JSON.stringify({ address: addressDraft.trim() }),
        },
      );
    }
  }

  function confirmDeleteAddress(address: AddressRow) {
    if (!customer) return;
    Alert.alert("Remove address?", address.formatted, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () =>
          void refreshFromContactMutation(
            `/api/customers/${customer.id}/addresses/${address.id}`,
            { method: "DELETE" },
          ),
      },
    ]);
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
        <Card style={styles.card}>
          <View style={styles.cardHead}>
            <Text style={KType.kicker}>Profile</Text>
            {editing ? (
              <IconBtn
                name="close"
                color={Colors.text}
                label="Cancel editing"
                onPress={cancelEdit}
                soft
              />
            ) : (
              <IconBtn
                name="create-outline"
                color={Colors.accent}
                label="Edit profile"
                onPress={startEdit}
                soft
              />
            )}
          </View>

          {editing ? (
            <>
              <Text style={styles.label}>Name</Text>
              <Field
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
              <Text style={styles.label}>Notes</Text>
              <Field
                value={notes}
                onChangeText={setNotes}
                placeholder="Kitchen notes"
                multiline
                style={styles.notes}
              />
            </>
          ) : (
            <View style={styles.infoBlock}>
              <Text style={KType.bodyStrong}>{customer.name}</Text>
              <Text style={KType.meta}>
                {customer.notes?.trim() ? customer.notes : "No notes"}
              </Text>
            </View>
          )}

          <View style={styles.divider} />
          <View style={styles.sectionHead}>
            <Text style={KType.kicker}>Phones</Text>
            {editing ? (
              <IconBtn
                name="add"
                color={Colors.accent}
                label="Add phone"
                onPress={startAddPhone}
                soft
              />
            ) : null}
          </View>

          {customer.phones.length === 0 && phoneDraftId !== "new" ? (
            <Text style={KType.meta}>None on file</Text>
          ) : (
            customer.phones.map((phone) =>
              editing && phoneDraftId === phone.id ? (
                <View key={phone.id} style={styles.draftRow}>
                  <Field
                    value={phoneDraft}
                    onChangeText={setPhoneDraft}
                    keyboardType="phone-pad"
                    autoCapitalize="none"
                    style={styles.draftField}
                  />
                  <IconBtn
                    name="checkmark"
                    color={Colors.accent}
                    label="Save phone"
                    onPress={() => void commitPhoneDraft()}
                    soft
                  />
                  <IconBtn
                    name="close"
                    color={Colors.textSecondary}
                    label="Cancel"
                    onPress={clearContactDrafts}
                    soft
                  />
                </View>
              ) : (
                <View key={phone.id} style={styles.lineRow}>
                  <View style={styles.lineBody}>
                    {editing ? (
                      <Text style={KType.body}>
                        {formatPhone(phone.phoneE164)}
                        {phone.isPrimary ? " · primary" : ""}
                      </Text>
                    ) : (
                      <TelLink
                        phone={phone.phoneE164}
                        label={`${formatPhone(phone.phoneE164)}${phone.isPrimary ? " · primary" : ""}`}
                      />
                    )}
                  </View>
                  {editing ? (
                    <View style={styles.lineActions}>
                      <IconBtn
                        name="create-outline"
                        color={Colors.text}
                        label="Edit phone"
                        onPress={() => startEditPhone(phone)}
                      />
                      <IconBtn
                        name="trash-outline"
                        color={Colors.danger}
                        label="Delete phone"
                        onPress={() => confirmDeletePhone(phone)}
                      />
                    </View>
                  ) : null}
                </View>
              ),
            )
          )}

          {editing && phoneDraftId === "new" ? (
            <View style={styles.draftRow}>
              <Field
                value={phoneDraft}
                onChangeText={setPhoneDraft}
                placeholder="(519) 555-0100"
                keyboardType="phone-pad"
                autoCapitalize="none"
                style={styles.draftField}
              />
              <IconBtn
                name="checkmark"
                color={Colors.accent}
                label="Add phone"
                onPress={() => void commitPhoneDraft()}
                soft
              />
              <IconBtn
                name="close"
                color={Colors.textSecondary}
                label="Cancel"
                onPress={clearContactDrafts}
                soft
              />
            </View>
          ) : null}

          <View style={styles.divider} />
          <View style={styles.sectionHead}>
            <Text style={KType.kicker}>Addresses</Text>
            {editing ? (
              <IconBtn
                name="add"
                color={Colors.accent}
                label="Add address"
                onPress={startAddAddress}
                soft
              />
            ) : null}
          </View>

          {customer.addresses.length === 0 && addressDraftId !== "new" ? (
            <Text style={KType.meta}>None on file</Text>
          ) : (
            customer.addresses.map((address) =>
              editing && addressDraftId === address.id ? (
                <View key={address.id} style={styles.draftRow}>
                  <Field
                    value={addressDraft}
                    onChangeText={setAddressDraft}
                    autoCapitalize="words"
                    style={styles.draftField}
                  />
                  <IconBtn
                    name="checkmark"
                    color={Colors.accent}
                    label="Save address"
                    onPress={() => void commitAddressDraft()}
                    soft
                  />
                  <IconBtn
                    name="close"
                    color={Colors.textSecondary}
                    label="Cancel"
                    onPress={clearContactDrafts}
                    soft
                  />
                </View>
              ) : (
                <View key={address.id} style={styles.lineRow}>
                  <View style={styles.lineBody}>
                    {editing ? (
                      <>
                        <Text style={KType.body}>{address.formatted}</Text>
                        {address.isPrimary ? (
                          <Text style={KType.meta}>Primary</Text>
                        ) : null}
                      </>
                    ) : (
                      <View style={{ gap: 2 }}>
                        <MapsLink address={address.formatted} />
                        {address.isPrimary ? (
                          <Text style={KType.meta}>Primary</Text>
                        ) : null}
                      </View>
                    )}
                  </View>
                  {editing ? (
                    <View style={styles.lineActions}>
                      <IconBtn
                        name="create-outline"
                        color={Colors.text}
                        label="Edit address"
                        onPress={() => startEditAddress(address)}
                      />
                      <IconBtn
                        name="trash-outline"
                        color={Colors.danger}
                        label="Delete address"
                        onPress={() => confirmDeleteAddress(address)}
                      />
                    </View>
                  ) : null}
                </View>
              ),
            )
          )}

          {editing && addressDraftId === "new" ? (
            <View style={styles.draftRow}>
              <Field
                value={addressDraft}
                onChangeText={setAddressDraft}
                placeholder="Street, city, postal"
                autoCapitalize="words"
                style={styles.draftField}
              />
              <IconBtn
                name="checkmark"
                color={Colors.accent}
                label="Add address"
                onPress={() => void commitAddressDraft()}
                soft
              />
              <IconBtn
                name="close"
                color={Colors.textSecondary}
                label="Cancel"
                onPress={clearContactDrafts}
                soft
              />
            </View>
          ) : null}
        </Card>

        <View style={styles.past}>
          <Text style={KType.kicker}>
            Past orders · {customer.orderCount}
            {customer.deliveryCount > 0
              ? ` · ${customer.deliveryCount} deliveries`
              : ""}
          </Text>
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
          disabled={deleting || saving || contactBusy}
          icon={
            <Ionicons name="trash-outline" size={18} color={Colors.danger} />
          }
        />
      </StackScroll>

      {editing && dirty ? (
        <View
          style={[
            styles.footer,
            { paddingBottom: Math.max(insets.bottom, 12) },
          ]}
        >
          <Button
            label={saving ? "Saving…" : "Save changes"}
            onPress={() => void onSave()}
            disabled={saving || contactBusy}
          />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { gap: 8 },
  cardHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  infoBlock: { gap: 4 },
  label: { ...KType.metaStrong, marginTop: 4 },
  notes: { minHeight: 88, textAlignVertical: "top", paddingTop: 12 },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
    marginVertical: 6,
  },
  lineRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  lineBody: { flex: 1, gap: 2 },
  lineActions: { flexDirection: "row", gap: 2 },
  draftRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  draftField: { flex: 1 },
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
