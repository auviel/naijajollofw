import { useKitchenTheme } from "@/lib/kitchen/theme";
import { KType } from "@/lib/kitchen/typography";
import { useThemedStyles } from "@/lib/kitchen/use-themed-styles";
import { Button } from "@naijajollof/ui";
import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const BENEFITS: Array<{
  icon: React.ComponentProps<typeof Ionicons>["name"];
  text: string;
}> = [
  {
    icon: "notifications-outline",
    text: "Hear new tickets even when the phone is down",
  },
  {
    icon: "alert-circle-outline",
    text: "Insist alerts until someone Accepts or Bumps",
  },
  {
    icon: "settings-outline",
    text: "Change this anytime in Account → Preferences",
  },
];

export function PermissionPrimeSheet({
  busy,
  onAllow,
  onLater,
}: {
  busy: boolean;
  onAllow: () => void;
  onLater: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { colors } = useKitchenTheme();
  const styles = useThemedStyles((c) => ({
    backdrop: {
      flex: 1,
      justifyContent: "flex-end" as const,
      backgroundColor: "rgba(0,0,0,0.45)",
    },
    sheet: {
      backgroundColor: c.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingHorizontal: 20,
      paddingTop: 16,
      gap: 16,
      borderTopWidth: 1,
      borderColor: c.border,
    },
    handle: {
      alignSelf: "center" as const,
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: c.border,
      marginBottom: 4,
    },
    title: { ...KType.section, color: c.text },
    row: {
      flexDirection: "row" as const,
      alignItems: "flex-start" as const,
      gap: 12,
    },
    rowText: { ...KType.body, color: c.text, flex: 1 },
    actions: { gap: 10, marginTop: 4 },
  }));

  return (
    <Modal
      visible
      transparent
      animationType="slide"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      onRequestClose={onLater}
    >
      <Pressable style={styles.backdrop} onPress={onLater}>
        <Pressable
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, 16) + 8 },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.handle} />
          <Text style={styles.title}>Allow notifications</Text>
          {BENEFITS.map((benefit) => (
            <View key={benefit.text} style={styles.row}>
              <Ionicons
                name={benefit.icon}
                size={22}
                color={colors.accent}
              />
              <Text style={styles.rowText}>{benefit.text}</Text>
            </View>
          ))}
          <View style={styles.actions}>
            <Button
              label={busy ? "…" : "Allow"}
              onPress={onAllow}
              disabled={busy}
            />
            <Button
              label="Maybe later"
              variant="ghost"
              onPress={onLater}
              disabled={busy}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
