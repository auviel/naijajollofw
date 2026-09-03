import { Radii, Shadows } from "@naijajollof/ui";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { KType } from "@/lib/kitchen/typography";
import { useThemedStyles } from "@/lib/kitchen/use-themed-styles";

export type BoardColumnId = "new" | "cooking" | "ready";

type ColumnTab = {
  id: BoardColumnId;
  title: string;
  count: number;
};

export function ColumnTabs({
  columns,
  activeId,
  onChange,
}: {
  columns: ColumnTab[];
  activeId: BoardColumnId;
  onChange: (id: BoardColumnId) => void;
}) {
  const styles = useThemedStyles((c) => ({
    shell: {
      flexDirection: "row" as const,
      gap: 4,
      padding: 4,
      borderRadius: Radii.md,
      backgroundColor: c.backgroundWash,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
    },
    tab: {
      flex: 1,
      minHeight: 42,
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      gap: 6,
      borderRadius: Radii.sm,
      paddingHorizontal: 8,
    },
    tabSelected: {
      backgroundColor: c.surface,
      ...Shadows.card,
    },
    labelMuted: {
      color: c.textSecondary,
      fontWeight: "500" as const,
    },
    badge: {
      minWidth: 20,
      height: 20,
      paddingHorizontal: 5,
      borderRadius: Radii.pill,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      backgroundColor: "rgba(24,24,27,0.1)",
    },
    badgeSelected: {
      backgroundColor: c.backgroundWash,
    },
    badgeHot: {
      backgroundColor: c.accent,
    },
    badgeText: {
      ...KType.caption,
      fontSize: 11,
      color: c.textSecondary,
    },
    badgeTextSelected: {
      color: c.text,
    },
    badgeTextHot: {
      color: c.inverse,
    },
  }));

  return (
    <View style={styles.shell} accessibilityRole="tablist">
      {columns.map((column) => {
        const selected = column.id === activeId;
        const highlightNew = column.id === "new" && column.count > 0;
        return (
          <Pressable
            key={column.id}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(column.id)}
            style={[styles.tab, selected && styles.tabSelected]}
          >
            <Text style={[KType.label, !selected && styles.labelMuted]}>
              {column.title}
            </Text>
            <View
              style={[
                styles.badge,
                highlightNew && styles.badgeHot,
                selected && !highlightNew && styles.badgeSelected,
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  highlightNew && styles.badgeTextHot,
                  selected && !highlightNew && styles.badgeTextSelected,
                ]}
              >
                {column.count}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
