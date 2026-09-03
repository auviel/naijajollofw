import { Radii, Touch } from "@naijajollof/ui";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { useKitchenTheme } from "@/lib/kitchen/theme";
import { useThemedStyles } from "@/lib/kitchen/use-themed-styles";

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
  const { colors } = useKitchenTheme();
  const styles = useThemedStyles((c) => ({
    search: {
      minHeight: Touch.min,
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 10,
      paddingHorizontal: 14,
      borderRadius: Radii.sm,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    input: {
      flex: 1,
      minHeight: Touch.min,
      paddingVertical: 10,
      fontSize: 16,
      color: c.text,
    },
    clearBtn: {
      padding: 2,
    },
  }));

  return (
    <View style={styles.search}>
      <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
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
          <Ionicons
            name="close-circle"
            size={18}
            color={colors.textSecondary}
          />
        </Pressable>
      ) : null}
    </View>
  );
}
