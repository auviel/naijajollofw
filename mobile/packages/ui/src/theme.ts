import { Platform, type TextStyle, type ViewStyle } from "react-native";

export const Colors = {
  background: "#F3EDE6",
  backgroundWash: "#F8E4D4",
  surface: "#FFFBFA",
  surfaceElevated: "#FFFFFF",
  text: "#1C140F",
  textSecondary: "#6B574C",
  border: "rgba(28,20,15,0.08)",
  accent: "#CC5400",
  accentSoft: "#FFF1E8",
  accentHover: "#AD4700",
  success: "#04542E",
  successSoft: "#E8F6EE",
  danger: "#C62828",
  dangerSoft: "#FDECEA",
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
      shadowColor: "#3D2314",
      shadowOpacity: 0.08,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 8 },
    },
    android: {
      elevation: 2,
    },
    default: {},
  }) ?? {},
  float: Platform.select<ViewStyle>({
    ios: {
      shadowColor: "#3D2314",
      shadowOpacity: 0.14,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 10 },
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
  headerTransparent: Platform.OS === "ios",
  headerBlurEffect:
    Platform.OS === "ios" ? ("systemChromeMaterialLight" as const) : undefined,
  headerShadowVisible: false,
  headerTintColor: Colors.text,
  headerTitleStyle: {
    fontWeight: "700" as const,
    color: Colors.text,
  },
  headerStyle: {
    backgroundColor:
      Platform.OS === "ios" ? "transparent" : Colors.surface,
  },
  contentStyle: { backgroundColor: Colors.background },
};
