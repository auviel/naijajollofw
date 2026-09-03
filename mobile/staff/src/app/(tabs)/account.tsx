import { KitchenHeaderActions } from "@/components/kitchen/header-actions";
import { SafeScreen } from "@/components/kitchen/safe-screen";
import { useKitchenTheme } from "@/lib/kitchen/theme";
import { KType } from "@/lib/kitchen/typography";
import { useThemedStyles } from "@/lib/kitchen/use-themed-styles";
import { useAuth } from "@/lib/auth";
import { Button, Card } from "@naijajollof/ui";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

function Row({
  label,
  value,
  onPress,
}: {
  label: string;
  value?: string;
  onPress: () => void;
}) {
  const { colors } = useKitchenTheme();
  return (
    <Pressable onPress={onPress} style={styles.row} accessibilityRole="button">
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={KType.bodyStrong}>{label}</Text>
        {value ? <Text style={KType.meta}>{value}</Text> : null}
      </View>
      <Text style={[styles.chevron, { color: colors.textSecondary }]}>›</Text>
    </Pressable>
  );
}

export default function AccountScreen() {
  const { user, store, signOut } = useAuth();
  const router = useRouter();
  const { colors } = useKitchenTheme();
  const themed = useThemedStyles((c) => ({
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: c.border,
    },
  }));

  return (
    <SafeScreen>
      <View style={styles.wrap}>
        <View style={styles.topRow}>
          <Text style={[KType.page, { flex: 1 }]}>Account</Text>
          <KitchenHeaderActions />
        </View>

        <Card style={styles.card}>
          <Row
            label="You"
            value={user?.name}
            onPress={() => router.push("/account/you")}
          />
          <View style={themed.divider} />
          <Row
            label="Store"
            value={store?.name ?? user?.storeName}
            onPress={() => router.push("/account/store")}
          />
          <View style={themed.divider} />
          <Row
            label="Preferences"
            value="Notifications · Appearance"
            onPress={() => router.push("/account/preferences")}
          />
        </Card>

        <Button
          variant="danger"
          icon={
            <Ionicons name="log-out-outline" size={18} color={colors.danger} />
          }
          label="Sign out"
          onPress={() => void signOut()}
        />
      </View>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 20, gap: 16 },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  card: { paddingVertical: 4, gap: 0 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  chevron: {
    ...KType.section,
    fontWeight: "400",
  },
});
