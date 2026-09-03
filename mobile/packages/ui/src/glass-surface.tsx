import { Radii } from "./theme";
import { useUiTheme } from "./theme-context";
import { BlurView } from "expo-blur";
import * as GlassEffect from "expo-glass-effect";
import {
  Platform,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

type GlassStyle = "clear" | "regular" | "none";

type Props = {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  interactive?: boolean;
  tintColor?: string;
  /** iOS 26 liquid glass style. Falls back to blur / solid. */
  effect?: GlassStyle;
  /** Override theme scheme for this surface (defaults to UiThemeProvider). */
  colorScheme?: "auto" | "light" | "dark";
};

export function canUseLiquidGlass(): boolean {
  if (Platform.OS !== "ios") return false;
  const maybeApi = (
    GlassEffect as { isGlassEffectAPIAvailable?: () => boolean }
  ).isGlassEffectAPIAvailable;
  if (typeof maybeApi === "function" && !maybeApi()) return false;
  return GlassEffect.isLiquidGlassAvailable();
}

export function GlassSurface({
  children,
  style,
  interactive,
  tintColor,
  effect = "regular",
  colorScheme: colorSchemeProp,
}: Props) {
  const { colors, scheme } = useUiTheme();
  const colorScheme = colorSchemeProp ?? scheme;
  const isDark = colorScheme === "dark";

  if (canUseLiquidGlass()) {
    return (
      <GlassEffect.GlassView
        style={[styles.base, style]}
        glassEffectStyle={effect}
        isInteractive={interactive}
        tintColor={tintColor}
        colorScheme={colorScheme === "auto" ? "auto" : colorScheme}
      >
        {children}
      </GlassEffect.GlassView>
    );
  }

  if (Platform.OS === "ios") {
    return (
      <BlurView
        intensity={effect === "clear" ? 28 : 48}
        tint={isDark ? "dark" : "light"}
        style={[
          styles.base,
          {
            backgroundColor: isDark
              ? "rgba(30,30,34,0.82)"
              : "rgba(255,255,255,0.88)",
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.border,
          },
          style,
        ]}
      >
        {children}
      </BlurView>
    );
  }

  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: colors.surface,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** Groups liquid-glass children so morph/merge behaves correctly on iOS 26. */
export function GlassCluster({
  children,
  style,
  spacing = 12,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  spacing?: number;
}) {
  if (canUseLiquidGlass() && GlassEffect.GlassContainer) {
    return (
      <GlassEffect.GlassContainer spacing={spacing} style={style}>
        {children}
      </GlassEffect.GlassContainer>
    );
  }
  return <View style={style}>{children}</View>;
}

const styles = StyleSheet.create({
  base: {
    overflow: "hidden",
    borderRadius: Radii.md,
  },
});
