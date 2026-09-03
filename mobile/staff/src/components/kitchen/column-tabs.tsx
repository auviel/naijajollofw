import { Radii, Shadows } from "@naijajollof/ui";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { DarkPalette } from "@/lib/kitchen/theme";
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
  const styles = useThemedStyles((c) => {
    const dark = c.background === DarkPalette.background;
    return {
      shell: {
        flexDirection: "row" as const,
        gap: 4,
        padding: 4,
        borderRadius: Radii.md,
        backgroundColor: dark ? c.surface : c.backgroundWash,
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
        backgroundColor: dark ? c.surfaceElevated : c.surface,
        ...Shadows.card,
      },
      label: {
        ...KType.label,
        color: c.text,
      },
      labelMuted: {
        color: dark ? "#C8C8D0" : c.textSecondary,
        fontWeight: "500" as const,
      },
      badge: {
        minWidth: 20,
        height: 20,
        paddingHorizontal: 5,
        borderRadius: Radii.pill,
        alignItems: "center" as const,
        justifyContent: "center" as const,
        backgroundColor: dark
          ? "rgba(255,255,255,0.14)"
          : "rgba(24,24,27,0.1)",
      },
      badgeSelected: {
        backgroundColor: dark ? "rgba(255,255,255,0.1)" : c.backgroundWash,
      },
      badgeHot: {
        backgroundColor: c.accent,
      },
      badgeText: {
        ...KType.caption,
        fontSize: 11,
        color: dark ? "#E4E4E7" : c.textSecondary,
      },
      badgeTextSelected: {
        color: c.text,
      },
      badgeTextHot: {
        color: c.inverse,
      },
    };
  });

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
            <Text style={[styles.label, !selected && styles.labelMuted]}>
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
