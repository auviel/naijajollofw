import { useKitchenTheme } from "@/lib/kitchen/theme";
import { KType } from "@/lib/kitchen/typography";
import { useThemedStyles } from "@/lib/kitchen/use-themed-styles";
import { Radii } from "@naijajollof/ui";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type MenuAvailabilityFilter = "all" | "available" | "sold_out";

export type MenuFilterState = {
  categoryId: string | null;
  availability: MenuAvailabilityFilter;
};

export const DEFAULT_MENU_FILTERS: MenuFilterState = {
  categoryId: null,
  availability: "all",
};

const AVAILABILITY_OPTIONS: Array<{
  id: MenuAvailabilityFilter;
  label: string;
}> = [
  { id: "all", label: "All" },
  { id: "available", label: "Available" },
  { id: "sold_out", label: "Sold out" },
];

function OptionRow({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { colors } = useKitchenTheme();
  const styles = useThemedStyles((c) => ({
    row: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      minHeight: 44,
      paddingVertical: 10,
      gap: 12,
    },
    label: selected
      ? { ...KType.bodyStrong, color: c.accent }
      : { ...KType.body, color: c.text },
  }));

  return (
    <Pressable
      onPress={onPress}
      style={styles.row}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <Text style={styles.label}>{label}</Text>
      {selected ? (
        <Ionicons name="checkmark" size={20} color={colors.accent} />
      ) : null}
    </Pressable>
  );
}

export function MenuFilterSheet({
  visible,
  categories,
  value,
  onApply,
  onDismiss,
}: {
  visible: boolean;
  categories: Array<{ id: string; name: string }>;
  value: MenuFilterState;
  onApply: (next: MenuFilterState) => void;
  onDismiss: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { colors } = useKitchenTheme();
  const [draft, setDraft] = useState<MenuFilterState>(value);

  useEffect(() => {
    if (visible) setDraft(value);
  }, [visible, value]);

  const styles = useThemedStyles((c) => ({
    backdrop: {
      flex: 1,
      justifyContent: "flex-end" as const,
      backgroundColor: "rgba(24,24,27,0.45)",
    },
    sheet: {
      backgroundColor: c.surface,
      borderTopLeftRadius: Radii.lg,
      borderTopRightRadius: Radii.lg,
      paddingHorizontal: 20,
      paddingTop: 10,
      maxHeight: "78%" as const,
      gap: 8,
    },
    handle: {
      alignSelf: "center" as const,
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: c.border,
      marginBottom: 8,
    },
    title: { ...KType.section, marginBottom: 4 },
    sectionLabel: { ...KType.kicker, marginTop: 10, marginBottom: 2 },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: c.border,
    },
    footer: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      alignItems: "center" as const,
      paddingTop: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
      marginTop: 8,
    },
  }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onDismiss}
    >
      <Pressable style={styles.backdrop} onPress={onDismiss}>
        <Pressable
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, 16) },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.handle} />
          <Text style={styles.title}>Filters</Text>

          <ScrollView
            bounces={false}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.sectionLabel}>Category</Text>
            <OptionRow
              label="All"
              selected={draft.categoryId === null}
              onPress={() =>
                setDraft((prev) => ({ ...prev, categoryId: null }))
              }
            />
            {categories.map((category) => (
              <View key={category.id}>
                <View style={styles.divider} />
                <OptionRow
                  label={category.name}
                  selected={draft.categoryId === category.id}
                  onPress={() =>
                    setDraft((prev) => ({
                      ...prev,
                      categoryId: category.id,
                    }))
                  }
                />
              </View>
            ))}

            <Text style={styles.sectionLabel}>Availability</Text>
            {AVAILABILITY_OPTIONS.map((option, index) => (
              <View key={option.id}>
                {index > 0 ? <View style={styles.divider} /> : null}
                <OptionRow
                  label={option.label}
                  selected={draft.availability === option.id}
                  onPress={() =>
                    setDraft((prev) => ({
                      ...prev,
                      availability: option.id,
                    }))
                  }
                />
              </View>
            ))}
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              onPress={() => setDraft(DEFAULT_MENU_FILTERS)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Reset filters"
            >
              <Text style={KType.meta}>Reset</Text>
            </Pressable>
            <Pressable
              onPress={() => onApply(draft)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Apply filters"
            >
              <Text style={[KType.metaStrong, { color: colors.accent }]}>
                Apply
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
