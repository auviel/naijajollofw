import { Colors } from "@naijajollof/ui";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet } from "react-native";

export function IconBtn({
  name,
  color,
  label,
  onPress,
  soft,
}: {
  name: keyof typeof Ionicons.glyphMap;
  color: string;
  label: string;
  onPress: () => void;
  soft?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles.iconBtn, soft ? styles.iconBtnSoft : null]}
    >
      <Ionicons name={name} size={18} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtnSoft: {
    backgroundColor: Colors.secondarySoft,
  },
});
