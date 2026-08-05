import { Colors, Radii, Touch } from "./theme";
import { StyleSheet, TextInput, type TextInputProps } from "react-native";

export function Field(props: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor={Colors.textSecondary}
      {...props}
      style={[styles.input, props.style]}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: Touch.min,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    borderRadius: Radii.sm,
    paddingHorizontal: 16,
    fontSize: 16,
    color: Colors.text,
    backgroundColor: Colors.surface,
  },
});
