import { Platform, type TextStyle, type ViewStyle } from "react-native";

/**
 * Three-tone system:
 * 1) Neutrals — background / surfaces / text (readable, not branded)
 * 2) Primary (accent) — buttons, selected, alerts only
 * 3) Secondary — quieter actions / chrome
 */
export const Colors = {
  background: "#E8E8EC",
  backgroundWash: "#DCDCE2",
  surface: "#FFFFFF",
  surfaceElevated: "#FFFFFF",
  text: "#18181B",
  textSecondary: "#71717A",
  /** Visible on white cards over light gray canvas */
  border: "rgba(24,24,27,0.12)",
  /** Brand primary — CTAs, active tint, wait chips */
  accent: "#CC5400",
  /** Soft fill for selected / pressed primary (neutral track, not peach) */
  accentSoft: "#F4F4F5",
  accentHover: "#AD4700",
  /** Secondary actions / emphasis without brand orange */
  secondary: "#3F3F46",
  secondarySoft: "#F4F4F5",
  success: "#15803D",
  successSoft: "#F0FDF4",
  danger: "#DC2626",
  dangerSoft: "#FEF2F2",
  inverse: "#FFFFFF",
};

export const Space = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
};

export const Radii = {
  sm: Platform.select({ ios: 12, android: 16, default: 12 }) ?? 12,
  md: Platform.select({ ios: 18, android: 22, default: 18 }) ?? 18,
  lg: Platform.select({ ios: 24, android: 28, default: 24 }) ?? 24,
  pill: 999,
  button: Platform.select({ ios: 16, android: 28, default: 16 }) ?? 16,
};

export const Type = {
  kicker: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: Colors.accent,
  } satisfies TextStyle,
  display: {
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -0.6,
    color: Colors.text,
  } satisfies TextStyle,
  title: {
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.4,
    color: Colors.text,
  } satisfies TextStyle,
  headline: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.text,
  } satisfies TextStyle,
  body: {
    fontSize: 16,
    fontWeight: "500",
    color: Colors.text,
  } satisfies TextStyle,
  meta: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.textSecondary,
  } satisfies TextStyle,
  caption: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textSecondary,
  } satisfies TextStyle,
};

export const Shadows = {
  card: Platform.select<ViewStyle>({
    ios: {
      shadowColor: "#18181B",
      shadowOpacity: 0.1,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
    },
    android: {
      elevation: 3,
    },
    default: {},
  }) ?? {},
  float: Platform.select<ViewStyle>({
    ios: {
      shadowColor: "#18181B",
      shadowOpacity: 0.14,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 8 },
    },
    android: {
      elevation: 8,
    },
    default: {},
  }) ?? {},
};

export const Touch = {
  min: 48,
};

export const headerScreenOptions = {
  /**
   * Opaque headers on every platform so scroll content never sits under the
   * nav bar (Dynamic Island, notch, Android status/cutout). Blur/transparent
   * headers require per-screen inset hacks that break across sizes.
   */
  headerTransparent: false,
  headerShadowVisible: false,
  headerTintColor: Colors.text,
  /** iOS: chevron only — no “Back” / route-group labels like “(tabs)”. */
  headerBackButtonDisplayMode: "minimal" as const,
  headerTitleStyle: {
    fontWeight: "600" as const,
    fontSize: 17,
    color: Colors.text,
  },
  headerStyle: {
    backgroundColor: Colors.surface,
  },
  contentStyle: { backgroundColor: Colors.background },
};
