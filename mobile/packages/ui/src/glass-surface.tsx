import { Colors, Radii } from "./theme";
import { BlurView } from "expo-blur";
import * as GlassEffect from "expo-glass-effect";
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

type Props = {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  interactive?: boolean;
  tintColor?: string;
};

function canUseLiquidGlass(): boolean {
  if (Platform.OS !== "ios") return false;
  const maybeApi = (
    GlassEffect as { isGlassEffectAPIAvailable?: () => boolean }
  ).isGlassEffectAPIAvailable;
  if (typeof maybeApi === "function" && !maybeApi()) return false;
  return GlassEffect.isLiquidGlassAvailable();
}

export function GlassSurface({ children, style, interactive, tintColor }: Props) {
  if (canUseLiquidGlass()) {
    return (
      <GlassEffect.GlassView
        style={[styles.base, style]}
        glassEffectStyle="regular"
        isInteractive={interactive}
        tintColor={tintColor}
      >
        {children}
      </GlassEffect.GlassView>
    );
  }

  if (Platform.OS === "ios") {
    return (
      <BlurView intensity={42} tint="light" style={[styles.base, styles.iosFallback, style]}>
        {children}
      </BlurView>
    );
  }

  return <View style={[styles.base, styles.android, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  base: {
    overflow: "hidden",
    borderRadius: Radii.md,
  },
  iosFallback: {
    backgroundColor: "rgba(255,251,250,0.62)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  android: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
});
