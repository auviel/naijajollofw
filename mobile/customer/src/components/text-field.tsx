import { Colors } from "@/constants/theme";
import { StyleSheet, TextInput, type TextInputProps } from "react-native";

export function TextField(props: TextInputProps) {
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
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.text,
    backgroundColor: Colors.surface,
  },
});
