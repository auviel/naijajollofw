import { useInboxUnread } from "@/lib/kitchen/inbox-unread";
import { useKitchenTheme } from "@/lib/kitchen/theme";
import { KType } from "@/lib/kitchen/typography";
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
  const { colors } = useKitchenTheme();
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
          <Ionicons name="list-outline" size={14} color={colors.accent} />
          <Text style={[styles.link, { color: colors.accent }]}>All orders</Text>
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
          color={colors.text}
        />
        {count > 0 ? (
          <View style={[styles.dot, { backgroundColor: colors.accent }]} />
        ) : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 14 },
  linkBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  link: { ...KType.metaStrong },
  bellWrap: { position: "relative", padding: 4 },
  dot: {
    position: "absolute",
    top: 2,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
