import { formatKitchenWait } from "@/lib/kitchen/format";
import { useKitchenTheme } from "@/lib/kitchen/theme";
import { KType } from "@/lib/kitchen/typography";
import { useThemedStyles } from "@/lib/kitchen/use-themed-styles";
import {
  formatCadFromCents,
  type StaffOrderListItem,
} from "@naijajollof/api-types";
import { Button } from "@naijajollof/ui";
import { Modal, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function ticketLabel(order: StaffOrderListItem): string {
  return (
    order.displayNumber ??
    (order.dayTicket ? `#${order.dayTicket}` : "New order")
  );
}

function fulfillmentLabel(order: StaffOrderListItem): string {
  return order.fulfillmentType === "delivery" ? "Delivery" : "Pickup";
}

export function InsistOverlay({
  order,
  moreWaiting,
  bumpBusy,
  onAccept,
  onBump,
}: {
  order: StaffOrderListItem;
  moreWaiting: number;
  bumpBusy: boolean;
  onAccept: () => void;
  onBump: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { colors } = useKitchenTheme();
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
    summary: { ...KType.body, color: c.text, marginTop: 20 },
    notes: {
      ...KType.meta,
      color: c.textSecondary,
      fontStyle: "italic" as const,
      marginTop: 8,
    },
    more: { ...KType.metaStrong, color: c.textSecondary, marginTop: 16 },
    actions: { gap: 12 },
  }));

  const wait = formatKitchenWait(order.placedAt ?? order.createdAt);

  return (
    <Modal
      visible
      animationType="fade"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      onRequestClose={onAccept}
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
            {fulfillmentLabel(order)} · {formatCadFromCents(order.totalCents)}
          </Text>
          {order.itemSummary ? (
            <Text style={styles.summary} numberOfLines={4}>
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
          <Button
            label={bumpBusy ? "…" : "Start"}
            onPress={onBump}
            disabled={bumpBusy}
          />
          <Button
            label="Accept"
            variant="secondary"
            onPress={onAccept}
            disabled={bumpBusy}
            style={{ backgroundColor: colors.surfaceElevated }}
          />
        </View>
      </View>
    </Modal>
  );
}
