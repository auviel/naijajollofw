import {
  formatCadFromCents,
  type StaffOrderListItem,
} from "@naijajollof/api-types";
import { Colors, Radii, Shadows } from "@naijajollof/ui";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ItemThumb } from "@/components/kitchen/item-thumb";
import { isStatusBump, primaryBumpFor } from "@/lib/kitchen/bump";
import {
  formatKitchenScheduled,
  formatKitchenWait,
} from "@/lib/kitchen/format";
import { KType } from "@/lib/kitchen/typography";

export function TicketCard({
  order,
  onOpen,
  onBump,
  bumpBusy,
}: {
  order: StaffOrderListItem;
  onOpen: () => void;
  onBump: () => void;
  bumpBusy?: boolean;
}) {
  const bump = primaryBumpFor(order);
  const wait = formatKitchenWait(order.placedAt ?? order.createdAt);
  const ticket =
    order.displayNumber ??
    (order.dayTicket ? `#${order.dayTicket}` : "Order");
  const thumbs = order.thumbImageUrls ?? [];

  return (
    <View style={styles.card}>
      <Pressable onPress={onOpen} style={styles.body}>
        <View style={styles.top}>
          <Text style={KType.ticket}>{ticket}</Text>
          <View style={styles.topRight}>
            {wait ? <Text style={KType.wait}>{wait}</Text> : null}
            <Text style={KType.numeric}>{formatCadFromCents(order.totalCents)}</Text>
          </View>
        </View>

        <View style={styles.mid}>
          {thumbs.length > 0 ? (
            <View style={styles.thumbs}>
              {thumbs.slice(0, 3).map((url, index) => (
                <ItemThumb
                  key={`${url}-${index}`}
                  uri={url}
                  size={44}
                  style={[
                    styles.thumb,
                    index > 0 ? { marginLeft: -10 } : null,
                    { zIndex: 3 - index },
                  ]}
                />
              ))}
            </View>
          ) : (
            <ItemThumb uri={null} size={44} />
          )}
          <View style={styles.midCopy}>
            <Text style={KType.bodyStrong}>{order.customerName}</Text>
            <Text style={KType.meta} numberOfLines={2}>
              {order.fulfillmentType === "delivery" ? "Delivery" : "Pickup"}
              {order.scheduledFor
                ? ` · ${formatKitchenScheduled(order.scheduledFor)}`
                : ""}
              {" · "}
              {order.itemSummary}
            </Text>
            {order.notes ? (
              <Text style={styles.notes} numberOfLines={1}>
                {order.notes}
              </Text>
            ) : null}
          </View>
        </View>
      </Pressable>

      {bump ? (
        <View style={styles.bumpWrap}>
          <Pressable
            onPress={onBump}
            disabled={bumpBusy}
            style={({ pressed }) => [
              styles.bump,
              pressed && !bumpBusy && styles.bumpPressed,
              bumpBusy && styles.bumpDisabled,
            ]}
          >
            <Text style={styles.bumpText}>
              {bumpBusy ? "…" : isStatusBump(bump) ? bump.label : bump.label}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    ...Shadows.card,
    overflow: "hidden",
  },
  body: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
    gap: 8,
  },
  top: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  topRight: {
    alignItems: "flex-end",
    gap: 2,
  },
  mid: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  thumbs: {
    flexDirection: "row",
    alignItems: "center",
  },
  thumb: {
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  midCopy: { flex: 1, gap: 2 },
  notes: {
    ...KType.metaStrong,
    marginTop: 2,
    fontStyle: "italic",
  },
  bumpWrap: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  bump: {
    minHeight: 44,
    borderRadius: Radii.button,
    backgroundColor: Colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  bumpPressed: {
    backgroundColor: Colors.accentHover,
  },
  bumpDisabled: {
    opacity: 0.55,
  },
  bumpText: {
    ...KType.action,
    color: Colors.inverse,
  },
});
