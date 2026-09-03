import { Colors, Field, Touch } from "@naijajollof/ui";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  Pressable,
  StyleSheet,
  View,
  type TextInputProps,
} from "react-native";

type PasswordFieldProps = Omit<TextInputProps, "secureTextEntry">;

export function PasswordField(props: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <View style={styles.wrap}>
      <Field
        {...props}
        secureTextEntry={!visible}
        style={[styles.input, props.style]}
      />
      <Pressable
        onPress={() => setVisible((v) => !v)}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={visible ? "Hide password" : "Show password"}
        style={styles.toggle}
      >
        <Ionicons
          name={visible ? "eye-off-outline" : "eye-outline"}
          size={20}
          color={Colors.textSecondary}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "relative",
    justifyContent: "center",
  },
  input: {
    paddingRight: 48,
  },
  toggle: {
    position: "absolute",
    right: 12,
    height: Touch.min,
    width: 36,
    alignItems: "center",
    justifyContent: "center",
  },
});
