import { useThemedStyles } from "@/lib/kitchen/use-themed-styles";
import { Ionicons } from "@expo/vector-icons";
import { Pressable } from "react-native";

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
  const styles = useThemedStyles((c) => ({
    iconBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    iconBtnSoft: {
      backgroundColor: c.secondarySoft,
    },
  }));

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
