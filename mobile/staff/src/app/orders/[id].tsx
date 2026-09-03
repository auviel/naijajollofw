import { apiFetch } from "@/lib/api";
import { StackScroll } from "@/components/kitchen/stack-scroll";
import { MapsLink, TelLink } from "@/components/kitchen/contact-links";
import { ItemThumb } from "@/components/kitchen/item-thumb";
import { ActionIcon } from "@/lib/kitchen/action-icon";
import { useKitchenTheme } from "@/lib/kitchen/theme";
import { KType } from "@/lib/kitchen/typography";
import { useThemedStyles } from "@/lib/kitchen/use-themed-styles";
import { formatCadFromCents, type StaffOrderDetail } from "@naijajollof/api-types";
import {
  Button,
  Card,
  KitchenTicketSkeleton,
  Screen,
} from "@naijajollof/ui";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

function ticketTitle(order: StaffOrderDetail): string {
  return (
    order.displayNumber ??
    (order.dayTicket ? `#${order.dayTicket}` : "Order")
  );
}

function ticketSubtitle(order: StaffOrderDetail): string {
  const kind = order.fulfillmentType === "delivery" ? "Delivery" : "Pickup";
  const status = order.status.replaceAll("_", " ");
  return `${kind} · ${status}`;
}

function OrderHeaderTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  const { colors } = useKitchenTheme();
  return (
    <View style={headerStyles.wrap} accessibilityRole="header">
      <Text
        style={[headerStyles.title, { color: colors.text }]}
        numberOfLines={1}
      >
        {title}
      </Text>
      <Text
        style={[headerStyles.subtitle, { color: colors.textSecondary }]}
        numberOfLines={1}
      >
        {subtitle}
      </Text>
    </View>
  );
}

const headerStyles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    maxWidth: 220,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 1,
  },
});

export default function TicketScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const styles = useThemedStyles((c) => ({
    card: { gap: 4 },
    blockGap: { marginTop: 4 },
    notesBlock: {
      gap: 4,
      marginBottom: 10,
      paddingBottom: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    lines: { gap: 0 },
    lineRow: {
      flexDirection: "row" as const,
      alignItems: "flex-start" as const,
      justifyContent: "space-between" as const,
      gap: 12,
      paddingVertical: 10,
    },
    lineRowBorder: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
    },
  lineCopy: { flex: 1, gap: 2 },
  totalRow: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      alignItems: "center" as const,
      marginTop: 4,
      paddingTop: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
    },
    actions: { gap: 10, marginTop: 8 },
    error: { ...KType.metaStrong, color: c.danger },
  }));
  const { resolved } = useKitchenTheme();
  const [order, setOrder] = useState<StaffOrderDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const data = await apiFetch<StaffOrderDetail>(`/api/orders/${id}`);
      setOrder(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load ticket");
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  useLayoutEffect(() => {
    if (!order) {
      navigation.setOptions({
        title: "Order",
        headerTitle: undefined,
      });
      return;
    }
    const title = ticketTitle(order);
    const subtitle = ticketSubtitle(order);
    navigation.setOptions({
      title,
      headerTitle: () => <OrderHeaderTitle title={title} subtitle={subtitle} />,
    });
  }, [navigation, order, resolved]);

  async function transition(to: string) {
    if (!id) return;
    setBusy(to);
    try {
      const data = await apiFetch<StaffOrderDetail>(`/api/orders/${id}/transition`, {
        method: "POST",
        body: JSON.stringify({ to }),
      });
      setOrder(data);
    } catch (err) {
      Alert.alert("Could not update", err instanceof Error ? err.message : "Try again");
    } finally {
      setBusy(null);
    }
  }

  async function fulfillManual() {
    if (!id) return;
    setBusy("manual");
    try {
      const data = await apiFetch<StaffOrderDetail>(`/api/orders/${id}/fulfill/manual`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      setOrder(data);
    } catch (err) {
      Alert.alert("Could not dispatch", err instanceof Error ? err.message : "Try again");
    } finally {
      setBusy(null);
    }
  }

  if (!order) {
    return (
      <Screen>
        {error ? (
          <Text style={[styles.error, { margin: 20, marginTop: 12 }]}>{error}</Text>
        ) : (
          <StackScroll>
            <KitchenTicketSkeleton />
          </StackScroll>
        )}
      </Screen>
    );
  }

  return (
    <Screen>
      <StackScroll>
        {/* Cook-first: exceptions → food → total, then who/where for handoff */}
        <Card style={styles.card}>
          {order.notes ? (
            <View style={styles.notesBlock}>
              <Text style={KType.kicker}>Notes</Text>
              <Text style={KType.bodyStrong}>{order.notes}</Text>
            </View>
          ) : null}

          <View style={styles.lines}>
            {order.lineItems.map((line, index) => (
              <View
                key={line.id}
                style={[
                  styles.lineRow,
                  index > 0 && styles.lineRowBorder,
                ]}
              >
                <ItemThumb uri={line.imageUrl} size={48} />
                <View style={styles.lineCopy}>
                  <Text style={KType.bodyStrong}>
                    {line.quantity > 1 ? `${line.quantity}× ` : ""}
                    {line.name}
                  </Text>
                  {line.modifiers.length > 0 ? (
                    <Text style={KType.meta}>
                      {line.modifiers.map((m) => m.name).join(", ")}
                    </Text>
                  ) : null}
                </View>
              </View>
            ))}
          </View>

          <View style={styles.totalRow}>
            <Text style={KType.section}>Total</Text>
            <Text style={KType.section}>
              {formatCadFromCents(order.totalCents)}
            </Text>
          </View>
        </Card>

        <Card style={styles.card}>
          <Text style={KType.kicker}>Guest</Text>
          <Text style={KType.bodyStrong}>{order.customerName}</Text>
          <TelLink phone={order.customerPhone} />
          {order.dropoffAddress ? (
            <View style={styles.blockGap}>
              <MapsLink address={order.dropoffAddress} />
            </View>
          ) : null}
          {order.scheduledFor ? (
            <Text style={[KType.meta, styles.blockGap]}>
              Scheduled {new Date(order.scheduledFor).toLocaleString("en-CA")}
            </Text>
          ) : null}
        </Card>

        <View style={styles.actions}>
          {order.allowedActions
            .filter((action) => action.variant !== "danger")
            .map((action) => (
              <Button
                key={action.to}
                disabled={Boolean(busy)}
                variant="primary"
                icon={<ActionIcon to={action.to} variant="primary" />}
                label={busy === action.to ? "Working…" : action.label}
                onPress={() => void transition(action.to)}
              />
            ))}
          {order.needsFulfillment ? (
            <Button
              disabled={Boolean(busy)}
              variant="secondary"
              icon={<ActionIcon to="fulfill_manual" variant="secondary" />}
              label={
                busy === "manual" ? "Working…" : "Out for delivery (manual)"
              }
              onPress={() => void fulfillManual()}
            />
          ) : null}
          {order.allowedActions
            .filter((action) => action.variant === "danger")
            .map((action) => (
              <Button
                key={action.to}
                disabled={Boolean(busy)}
                variant="danger"
                icon={<ActionIcon to={action.to} variant="danger" />}
                label={busy === action.to ? "Working…" : action.label}
                onPress={() => {
                  Alert.alert("Cancel this order?", undefined, [
                    { text: "Keep", style: "cancel" },
                    {
                      text: "Cancel order",
                      style: "destructive",
                      onPress: () => void transition(action.to),
                    },
                  ]);
                }}
              />
            ))}
        </View>
      </StackScroll>
    </Screen>
  );
}
