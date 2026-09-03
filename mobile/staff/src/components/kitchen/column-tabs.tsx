import { Colors, Radii, Shadows } from "@naijajollof/ui";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { KType } from "@/lib/kitchen/typography";

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

const styles = StyleSheet.create({
  shell: {
    flexDirection: "row",
    gap: 4,
    padding: 4,
    borderRadius: Radii.md,
    backgroundColor: Colors.backgroundWash,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  tab: {
    flex: 1,
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: Radii.sm,
    paddingHorizontal: 8,
  },
  tabSelected: {
    backgroundColor: Colors.surface,
    ...Shadows.card,
  },
  labelMuted: {
    color: Colors.textSecondary,
    fontWeight: "500",
  },
  badge: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: Radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(24,24,27,0.1)",
  },
  badgeSelected: {
    backgroundColor: Colors.backgroundWash,
  },
  badgeHot: {
    backgroundColor: Colors.accent,
  },
  badgeText: {
    ...KType.caption,
    fontSize: 11,
    color: Colors.textSecondary,
  },
  badgeTextSelected: {
    color: Colors.text,
  },
  badgeTextHot: {
    color: Colors.inverse,
  },
});
