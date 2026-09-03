import { useKitchenTheme } from "@/lib/kitchen/theme";
import { useMemo } from "react";
import {
  StyleSheet,
  type ImageStyle,
  type TextStyle,
  type ViewStyle,
} from "react-native";

type NamedStyles<T> = { [P in keyof T]: ViewStyle | TextStyle | ImageStyle };

/**
 * Rebuild StyleSheet when kitchen colors change (dark / light / system).
 * Pass an inline factory — only `colors` is tracked as a dependency.
 */
export function useThemedStyles<T extends NamedStyles<T>>(
  factory: (colors: ReturnType<typeof useKitchenTheme>["colors"]) => T,
): T {
  const { colors } = useKitchenTheme();
  // factory is intentionally omitted: callers pass an inline fn that only reads `colors`.
  return useMemo(() => StyleSheet.create(factory(colors)), [colors]);
}
