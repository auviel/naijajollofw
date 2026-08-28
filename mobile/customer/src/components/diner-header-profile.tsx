import { Colors, Touch } from "@naijajollof/ui";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet } from "react-native";

/** Header profile control — opens stack Account screen. */
export function DinerHeaderProfile() {
  const router = useRouter();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Account"
      hitSlop={8}
      onPress={() => router.push("/account")}
      style={styles.hit}
    >
      <Ionicons name="person-circle-outline" size={28} color={Colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: {
    minWidth: Touch.min,
    minHeight: Touch.min,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 4,
  },
});
