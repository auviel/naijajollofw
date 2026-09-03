import { Colors, Radii, Shadows, Space } from "./theme";
import { useEffect, useRef } from "react";
import {
  Animated,
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

/** Soft pulse placeholder — content-shaped loading, not a spinner. */
export function Skeleton({
  style,
  height = 16,
  width = "100%",
  radius = Radii.sm,
}: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.45,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      accessibilityRole="none"
      style={[
        styles.base,
        { height, width, borderRadius: radius, opacity },
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

/** Kitchen board — mirrors column tabs + ticket cards. */
export function KitchenBoardSkeleton() {
  return (
    <View style={styles.boardPad} accessibilityLabel="Loading kitchen board">
      <Skeleton height={28} width="55%" />
      <Skeleton height={14} width={64} style={{ marginTop: Space.xs }} />
      <View style={styles.segment}>
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} height={42} style={{ flex: 1 }} radius={Radii.sm} />
        ))}
      </View>
      {Array.from({ length: 3 }, (_, i) => (
        <View key={i} style={styles.ticketCard}>
          <View style={styles.ticketTop}>
            <Skeleton height={18} width="30%" />
            <Skeleton height={14} width={56} />
          </View>
          <Skeleton height={15} width="45%" style={{ marginTop: Space.sm }} />
          <Skeleton height={13} width="80%" style={{ marginTop: Space.xs }} />
          <Skeleton
            height={44}
            radius={Radii.button}
            style={{ marginTop: Space.md }}
          />
        </View>
      ))}
    </View>
  );
}

/** Kitchen ticket detail. */
export function KitchenTicketSkeleton() {
  return (
    <View style={styles.screenPad} accessibilityLabel="Loading ticket">
      <Skeleton height={24} width="40%" />
      <Skeleton height={14} width="50%" style={{ marginTop: Space.sm }} />
      <Skeleton height={15} width="70%" style={{ marginTop: Space.md }} />
      {Array.from({ length: 3 }, (_, i) => (
        <View key={i} style={styles.orderCard}>
          <Skeleton height={15} width="65%" />
          <Skeleton height={12} width="40%" style={{ marginTop: Space.xs }} />
        </View>
      ))}
      <Skeleton height={48} radius={Radii.button} style={{ marginTop: Space.md }} />
      <Skeleton height={48} radius={Radii.button} style={{ marginTop: Space.sm }} />
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: Colors.backgroundWash,
  },
  screenPad: {
    flex: 1,
    padding: Space.md,
    gap: Space.sm,
  },
  boardPad: {
    paddingTop: Space.xs,
    gap: Space.md,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Space.xs,
    marginBottom: Space.md,
  },
  segment: {
    flexDirection: "row",
    gap: 4,
    marginTop: Space.md,
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
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    padding: Space.md,
    marginTop: Space.sm,
  },
  ticketCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    padding: Space.md,
    ...Shadows.card,
  },
  ticketTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
});
