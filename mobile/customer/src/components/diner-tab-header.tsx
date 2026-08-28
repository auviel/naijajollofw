import { DinerHeaderProfile } from "@/components/diner-header-profile";
import { Colors, Type } from "@naijajollof/ui";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet, Text, View } from "react-native";

/** Compact title + profile row for iOS NativeTabs (no stack headerRight). */
export function DinerTabHeader({ title }: { title: string }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.row, { paddingTop: Math.max(insets.top, 8) }]}>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      <DinerHeaderProfile />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 4,
    backgroundColor: Colors.background,
  },
  title: {
    ...Type.headline,
    flex: 1,
    marginRight: 8,
  },
});
