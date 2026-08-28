import { Colors, Radii, Space } from "./theme";
import {
  type DimensionValue,
  type StyleProp,
  StyleSheet,
  View,
  type ViewStyle,
} from "react-native";

type SkeletonProps = {
  style?: StyleProp<ViewStyle>;
  height?: number;
  width?: DimensionValue;
  radius?: number;
};

/** Pulsing placeholder block for mobile loading states. */
export function Skeleton({
  style,
  height = 16,
  width = "100%",
  radius = Radii.sm,
}: SkeletonProps) {
  return (
    <View
      accessibilityRole="none"
      style={[
        styles.base,
        { height, width, borderRadius: radius },
        style,
      ]}
    />
  );
}

export function MenuScreenSkeleton() {
  return (
    <View style={styles.screenPad} accessibilityLabel="Loading menu">
      <Skeleton height={18} width="40%" style={{ marginBottom: Space.md }} />
      <View style={styles.chipRow}>
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} height={32} width={72} radius={Radii.pill} />
        ))}
      </View>
      {Array.from({ length: 4 }, (_, i) => (
        <View key={i} style={styles.menuRow}>
          <Skeleton height={72} width={72} radius={Radii.md} />
          <View style={styles.menuCopy}>
            <Skeleton height={16} width="70%" />
            <Skeleton height={12} width="40%" style={{ marginTop: Space.xs }} />
          </View>
        </View>
      ))}
    </View>
  );
}

export function CartScreenSkeleton() {
  return (
    <View style={styles.screenPad} accessibilityLabel="Loading cart">
      {Array.from({ length: 3 }, (_, i) => (
        <View key={i} style={styles.menuRow}>
          <Skeleton height={64} width={64} radius={Radii.md} />
          <View style={styles.menuCopy}>
            <Skeleton height={16} width="65%" />
            <Skeleton height={12} width="30%" style={{ marginTop: Space.xs }} />
            <Skeleton
              height={28}
              width={100}
              radius={Radii.pill}
              style={{ marginTop: Space.sm }}
            />
          </View>
        </View>
      ))}
      <Skeleton
        height={48}
        radius={Radii.button}
        style={{ marginTop: Space.lg }}
      />
    </View>
  );
}

export function OrdersScreenSkeleton() {
  return (
    <View style={styles.screenPad} accessibilityLabel="Loading orders">
      {Array.from({ length: 4 }, (_, i) => (
        <View key={i} style={styles.orderCard}>
          <Skeleton height={16} width="55%" />
          <Skeleton height={12} width="40%" style={{ marginTop: Space.xs }} />
          <Skeleton height={14} width="25%" style={{ marginTop: Space.sm }} />
        </View>
      ))}
    </View>
  );
}

export function ItemScreenSkeleton() {
  return (
    <View style={styles.screenPad} accessibilityLabel="Loading item">
      <Skeleton height={220} radius={Radii.lg} />
      <Skeleton height={22} width="70%" style={{ marginTop: Space.lg }} />
      <Skeleton height={14} width="30%" style={{ marginTop: Space.sm }} />
      <Skeleton height={12} width="90%" style={{ marginTop: Space.md }} />
      <Skeleton height={12} width="75%" style={{ marginTop: Space.xs }} />
      <Skeleton height={48} radius={Radii.md} style={{ marginTop: Space.lg }} />
      <Skeleton height={48} radius={Radii.md} style={{ marginTop: Space.sm }} />
      <Skeleton
        height={48}
        radius={Radii.button}
        style={{ marginTop: Space.xl }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: Colors.border,
    opacity: 0.85,
  },
  screenPad: {
    flex: 1,
    padding: Space.md,
    gap: Space.sm,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Space.xs,
    marginBottom: Space.md,
  },
  menuRow: {
    flexDirection: "row",
    gap: Space.md,
    marginBottom: Space.md,
    alignItems: "center",
  },
  menuCopy: {
    flex: 1,
  },
  orderCard: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radii.md,
    padding: Space.md,
    marginBottom: Space.sm,
  },
});
