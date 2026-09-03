import {
  formatCadFromCents,
  type StaffOrderListItem,
} from "@naijajollof/api-types";
import { Radii, Shadows } from "@naijajollof/ui";
import * as Clipboard from "expo-clipboard";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { ItemThumb } from "@/components/kitchen/item-thumb";
import { isStatusBump, primaryBumpFor } from "@/lib/kitchen/bump";
import {
  formatKitchenScheduled,
  formatKitchenWait,
} from "@/lib/kitchen/format";
import { KType } from "@/lib/kitchen/typography";
import { useThemedStyles } from "@/lib/kitchen/use-themed-styles";

function isReadyish(status: StaffOrderListItem["status"]): boolean {
  return (
    status === "ready" ||
    status === "ready_for_pickup" ||
    status === "out_for_delivery"
  );
}

function metaLine(order: StaffOrderListItem, hasThumbs: boolean): string | null {
  const parts: string[] = [];
  if (order.fulfillmentType === "delivery") {
    parts.push("Delivery");
  }
  if (order.scheduledFor) {
    parts.push(formatKitchenScheduled(order.scheduledFor));
  }
  if (!hasThumbs && order.itemSummary) {
    parts.push(order.itemSummary);
  }
  if (parts.length === 0 && order.fulfillmentType === "pickup" && !hasThumbs) {
    parts.push("Pickup");
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}

export function TicketCard({
  order,
  onOpen,
  onBump,
  onLongPressBump,
  bumpBusy,
  showPrice,
}: {
  order: StaffOrderListItem;
  onOpen: () => void;
  onBump: () => void;
  onLongPressBump?: () => void;
  bumpBusy?: boolean;
  /** Override; default shows price on Ready (and similar) only. */
  showPrice?: boolean;
}) {
  const styles = useThemedStyles((c) => ({
    card: {
      backgroundColor: c.surface,
      borderRadius: Radii.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      ...Shadows.card,
      overflow: "hidden" as const,
    },
    body: {
      paddingHorizontal: 14,
      paddingTop: 14,
      paddingBottom: 12,
      gap: 8,
    },
    top: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      alignItems: "flex-start" as const,
      gap: 8,
    },
    topRight: {
      alignItems: "flex-end" as const,
      gap: 2,
    },
    mid: {
      flexDirection: "row" as const,
      alignItems: "flex-start" as const,
      gap: 10,
    },
    thumbs: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
    },
    thumb: {
      borderWidth: 2,
      borderColor: c.surface,
    },
    midCopy: { flex: 1, gap: 2 },
    notes: {
      ...KType.metaStrong,
      marginTop: 2,
      fontStyle: "italic" as const,
    },
    bumpWrap: {
      paddingHorizontal: 12,
      paddingBottom: 12,
    },
    bump: {
      minHeight: 44,
      borderRadius: Radii.button,
      backgroundColor: c.accent,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    bumpPressed: {
      backgroundColor: c.accentHover,
    },
    bumpDisabled: {
      opacity: 0.55,
    },
    bumpText: {
      ...KType.action,
      color: c.inverse,
    },
  }));

  const bump = primaryBumpFor(order);
  const wait = formatKitchenWait(order.placedAt ?? order.createdAt);
  const ticket =
    order.displayNumber ??
    (order.dayTicket ? `#${order.dayTicket}` : "Order");
  const thumbs = order.thumbImageUrls ?? [];
  const hasThumbs = thumbs.length > 0;
  const line = metaLine(order, hasThumbs);
  const priceVisible = showPrice ?? isReadyish(order.status);

  async function copyTicket() {
    try {
      await Clipboard.setStringAsync(ticket);
      Alert.alert("Copied", ticket);
    } catch {
      Alert.alert("Could not copy");
    }
  }

  return (
    <View style={styles.card}>
      <Pressable
        onPress={onOpen}
        onLongPress={() => {
          if (onLongPressBump && bump && isStatusBump(bump)) {
            onLongPressBump();
            return;
          }
          void copyTicket();
        }}
        delayLongPress={380}
        style={styles.body}
      >
        <View style={styles.top}>
          <Text style={[KType.bodyStrong, { flex: 1 }]} numberOfLines={1}>
            {order.customerName}
          </Text>
          <View style={styles.topRight}>
            {wait ? <Text style={KType.wait}>{wait}</Text> : null}
            {priceVisible ? (
              <Text style={KType.numeric}>
                {formatCadFromCents(order.totalCents)}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.mid}>
          {hasThumbs ? (
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
            {line ? (
              <Text style={KType.meta} numberOfLines={2}>
                {line}
              </Text>
            ) : null}
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
            <Text style={styles.bumpText}>{bumpBusy ? "…" : bump.label}</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
