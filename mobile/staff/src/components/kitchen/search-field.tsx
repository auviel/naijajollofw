import { Colors, Radii, Touch } from "@naijajollof/ui";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, TextInput, View } from "react-native";

export function SearchField({
  value,
  onChangeText,
  placeholder,
  accessibilityLabel = "Search",
}: {
  value: string;
  onChangeText: (next: string) => void;
  placeholder: string;
  accessibilityLabel?: string;
}) {
  return (
    <View style={styles.search}>
      <Ionicons name="search-outline" size={18} color={Colors.textSecondary} />
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={Colors.textSecondary}
        value={value}
        onChangeText={onChangeText}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        clearButtonMode="never"
        accessibilityLabel={accessibilityLabel}
      />
      {value.length > 0 ? (
        <Pressable
          onPress={() => onChangeText("")}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          style={styles.clearBtn}
        >
          <Ionicons name="close-circle" size={18} color={Colors.textSecondary} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  search: {
    minHeight: Touch.min,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    borderRadius: Radii.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  input: {
    flex: 1,
    minHeight: Touch.min,
    paddingVertical: 10,
    fontSize: 16,
    color: Colors.text,
  },
  clearBtn: {
    padding: 2,
  },
});
