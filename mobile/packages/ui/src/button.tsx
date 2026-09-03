import { Colors, Radii, Touch } from "./theme";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

type Variant = "primary" | "secondary" | "danger" | "ghost";

export function Button({
  label,
  onPress,
  disabled,
  variant = "primary",
  icon,
  style,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: Variant;
  /** Leading icon (SF/Ionicons). Keeps UI package free of icon deps. */
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const lightLabel = variant === "primary";
  const dangerLabel = variant === "danger";

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      android_ripple={{
        color:
          variant === "primary"
            ? "rgba(255,255,255,0.18)"
            : "rgba(24,24,27,0.08)",
      }}
      style={({ pressed }: { pressed: boolean }) => [
        styles.base,
        styles[variant],
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      <View style={styles.row}>
        {icon ? <View style={styles.icon}>{icon}</View> : null}
        <Text
          style={[
            styles.label,
            lightLabel && styles.labelLight,
            dangerLabel && styles.labelDanger,
            (variant === "secondary" || variant === "ghost") && styles.labelDark,
          ]}
        >
          {label}
        </Text>
      </View>
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
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  icon: {
    marginTop: 1,
  },
  primary: { backgroundColor: Colors.accent },
  secondary: {
    backgroundColor: Colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  /** Outline destructive — does not compete with primary fill */
  danger: {
    backgroundColor: Colors.dangerSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(220,38,38,0.35)",
  },
  ghost: { backgroundColor: "transparent" },
  disabled: { opacity: 0.45 },
  pressed: { transform: [{ scale: 0.98 }] },
  label: { fontSize: 15, fontWeight: "600", letterSpacing: -0.1 },
  labelLight: { color: Colors.inverse },
  labelDark: { color: Colors.secondary },
  labelDanger: { color: Colors.danger },
});
