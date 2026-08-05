import { Colors, Radii, Touch } from "./theme";
import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from "react-native";

type Variant = "primary" | "secondary" | "danger" | "ghost";

export function Button({
  label,
  onPress,
  disabled,
  variant = "primary",
  style,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: Variant;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      android_ripple={{ color: "rgba(255,255,255,0.18)" }}
      style={({ pressed }: { pressed: boolean }) => [
        styles.base,
        styles[variant],
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      <Text style={[styles.label, variant === "secondary" || variant === "ghost" ? styles.labelDark : styles.labelLight]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: Touch.min,
    borderRadius: Radii.button,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  primary: { backgroundColor: Colors.accent },
  secondary: {
    backgroundColor: Colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  danger: { backgroundColor: Colors.danger },
  ghost: { backgroundColor: "transparent" },
  disabled: { opacity: 0.45 },
  pressed: { transform: [{ scale: 0.98 }] },
  label: { fontSize: 16, fontWeight: "800" },
  labelLight: { color: Colors.inverse },
  labelDark: { color: Colors.text },
});
