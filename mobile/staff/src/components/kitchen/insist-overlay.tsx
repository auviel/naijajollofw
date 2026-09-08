import { formatKitchenWait } from "@/lib/kitchen/format";
import { KType } from "@/lib/kitchen/typography";
import { useThemedStyles } from "@/lib/kitchen/use-themed-styles";
import {
  formatCadFromCents,
  type StaffOrderListItem,
} from "@naijajollof/api-types";
import { Button } from "@naijajollof/ui";
import { useEffect, useState } from "react";
import { Modal, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function ticketLabel(order: StaffOrderListItem): string {
  return (
    order.displayNumber ??
    (order.dayTicket ? `#${order.dayTicket}` : "New order")
  );
}

export function InsistOverlay({
  order,
  moreWaiting,
  bumpBusy,
  onAccept,
  onPark,
  onDeclineConfirm,
}: {
  order: StaffOrderListItem;
  moreWaiting: number;
  bumpBusy: boolean;
  onAccept: () => void;
  onPark: () => void;
  onDeclineConfirm: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [confirmDecline, setConfirmDecline] = useState(false);
  const styles = useThemedStyles((c) => ({
    root: {
      flex: 1,
      backgroundColor: c.background,
      paddingHorizontal: 24,
      justifyContent: "space-between" as const,
    },
    top: { gap: 8 },
    kicker: { ...KType.kicker, color: c.accent },
    ticket: { ...KType.page, color: c.text },
    wait: { ...KType.wait, color: c.accent },
    customer: { ...KType.bodyStrong, color: c.text, marginTop: 16 },
    meta: { ...KType.meta, color: c.textSecondary, marginTop: 4 },
    where: { ...KType.body, color: c.text, marginTop: 8 },
    summary: { ...KType.body, color: c.text, marginTop: 20 },
    notes: {
      ...KType.meta,
      color: c.textSecondary,
      fontStyle: "italic" as const,
      marginTop: 8,
    },
    more: { ...KType.metaStrong, color: c.textSecondary, marginTop: 16 },
    actions: { gap: 12 },
    confirmHint: {
      ...KType.meta,
      color: c.textSecondary,
      textAlign: "center" as const,
      marginBottom: 4,
    },
  }));

  useEffect(() => {
    setConfirmDecline(false);
  }, [order.id]);

  const wait = formatKitchenWait(order.placedAt ?? order.createdAt);
  const isDelivery = order.fulfillmentType === "delivery";
  const whereLine = isDelivery
    ? order.dropoffAddress
      ? `Delivery · ${order.dropoffAddress}`
      : "Delivery"
    : "Pickup";

  return (
    <Modal
      visible
      animationType="fade"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      onRequestClose={onPark}
    >
      <View
        style={[
          styles.root,
          {
            paddingTop: Math.max(insets.top, 24) + 24,
            paddingBottom: Math.max(insets.bottom, 16) + 16,
          },
        ]}
      >
        <View style={styles.top}>
          <Text style={styles.kicker}>Incoming</Text>
          <Text style={styles.ticket}>{ticketLabel(order)}</Text>
          {wait ? <Text style={styles.wait}>{wait}</Text> : null}
          <Text style={styles.customer} numberOfLines={1}>
            {order.customerName}
          </Text>
          <Text style={styles.meta}>
            {formatCadFromCents(order.totalCents)}
          </Text>
          <Text style={styles.where} numberOfLines={3}>
            {whereLine}
          </Text>
          {order.itemSummary ? (
            <Text style={styles.summary} numberOfLines={5}>
              {order.itemSummary}
            </Text>
          ) : null}
          {order.notes ? (
            <Text style={styles.notes} numberOfLines={2}>
              {order.notes}
            </Text>
          ) : null}
          {moreWaiting > 0 ? (
            <Text style={styles.more}>
              {moreWaiting} more waiting
            </Text>
          ) : null}
        </View>

        <View style={styles.actions}>
          {confirmDecline ? (
            <>
              <Text style={styles.confirmHint}>
                Guest will be notified · order cancelled
              </Text>
              <Button
                label="Keep"
                onPress={() => setConfirmDecline(false)}
                disabled={bumpBusy}
              />
              <Button
                label={bumpBusy ? "…" : "Yes, decline"}
                variant="danger"
                onPress={onDeclineConfirm}
                disabled={bumpBusy}
              />
            </>
          ) : (
            <>
              <Button
                label={bumpBusy ? "…" : "Accept"}
                onPress={onAccept}
                disabled={bumpBusy}
              />
              <Button
                label="Decline"
                variant="ghost"
                onPress={() => setConfirmDecline(true)}
                disabled={bumpBusy}
              />
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}
