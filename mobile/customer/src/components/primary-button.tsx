import { Colors } from "@/constants/theme";
import { Pressable, StyleSheet, Text } from "react-native";

export function PrimaryButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[styles.button, disabled && styles.disabled]}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: Colors.accent,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
  },
  disabled: { opacity: 0.45 },
  label: { color: Colors.inverse, fontWeight: "800", fontSize: 16 },
});
