import { useInboxUnread } from "@/lib/kitchen/inbox-unread";
import { KType } from "@/lib/kitchen/typography";
import { Colors } from "@naijajollof/ui";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

export function KitchenHeaderActions({
  showAllOrders = false,
}: {
  showAllOrders?: boolean;
}) {
  const router = useRouter();
  const { count, refresh } = useInboxUnread();

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  return (
    <View style={styles.row}>
      {showAllOrders ? (
        <Pressable
          onPress={() => router.push("/orders")}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="All orders"
          style={styles.linkBtn}
        >
          <Ionicons name="list-outline" size={14} color={Colors.accent} />
          <Text style={styles.link}>All orders</Text>
          <Ionicons name="chevron-forward" size={12} color={Colors.accent} />
        </Pressable>
      ) : null}
      <Pressable
        onPress={() => router.push("/inbox")}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={
          count > 0 ? `Notifications, ${count} unread` : "Notifications"
        }
        style={styles.bellWrap}
      >
        <Ionicons
          name={count > 0 ? "notifications" : "notifications-outline"}
          size={22}
          color={Colors.text}
        />
        {count > 0 ? <View style={styles.dot} /> : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 14 },
  linkBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  link: { ...KType.metaStrong, color: Colors.accent },
  bellWrap: { position: "relative", padding: 4 },
  dot: {
    position: "absolute",
    top: 2,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.accent,
  },
});
