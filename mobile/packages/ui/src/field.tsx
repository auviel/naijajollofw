import { Radii, Touch } from "./theme";
import { useUiColors } from "./theme-context";
import { StyleSheet, TextInput, type TextInputProps } from "react-native";

export function Field(props: TextInputProps) {
  const colors = useUiColors();
  return (
    <TextInput
      placeholderTextColor={colors.textSecondary}
      {...props}
      style={[
        styles.input,
        {
          borderColor: colors.border,
          color: colors.text,
          backgroundColor: colors.surface,
        },
        props.style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: Touch.min,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radii.sm,
    paddingHorizontal: 16,
    fontSize: 16,
  },
});
