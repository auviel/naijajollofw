import { Colors as LightColors } from "@naijajollof/ui";
import { kvGet, kvSet } from "@/lib/kv";
import { DarkTheme, DefaultTheme, type Theme } from "expo-router";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Appearance, useColorScheme } from "react-native";

export type AppearancePref = "system" | "light" | "dark";

const KEY = "kitchen.pref.appearance";

export const DarkPalette = {
  ...LightColors,
  background: "#121214",
  backgroundWash: "#1C1C1F",
  surface: "#1E1E22",
  surfaceElevated: "#26262B",
  text: "#F4F4F5",
  textSecondary: "#A1A1AA",
  border: "rgba(255,255,255,0.12)",
  accentSoft: "#2A211C",
  secondary: "#D4D4D8",
  secondarySoft: "#27272A",
  successSoft: "#14532D",
  dangerSoft: "#3F1D1D",
  inverse: "#FFFFFF",
} as const;

type ThemeContextValue = {
  appearance: AppearancePref;
  resolved: "light" | "dark";
  colors: typeof LightColors;
  navigationTheme: Theme;
  setAppearance: (value: AppearancePref) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function KitchenThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const system = useColorScheme();
  const [appearance, setAppearanceState] = useState<AppearancePref>("system");

  useEffect(() => {
    void kvGet(KEY).then((v) => {
      if (v === "light" || v === "dark" || v === "system") {
        setAppearanceState(v);
      }
    });
  }, []);

  const setAppearance = useCallback((value: AppearancePref) => {
    setAppearanceState(value);
    void kvSet(KEY, value);
  }, []);

  const resolved: "light" | "dark" =
    appearance === "system"
      ? system === "dark"
        ? "dark"
        : "light"
      : appearance;

  const colors = resolved === "dark" ? DarkPalette : LightColors;

  const navigationTheme = useMemo<Theme>(() => {
    const base = resolved === "dark" ? DarkTheme : DefaultTheme;
    return {
      ...base,
      dark: resolved === "dark",
      colors: {
        ...base.colors,
        primary: colors.accent,
        background: colors.background,
        card: colors.surface,
        text: colors.text,
        border: colors.border,
        notification: colors.accent,
      },
    };
  }, [colors, resolved]);

  const value = useMemo(
    () => ({
      appearance,
      resolved,
      colors,
      navigationTheme,
      setAppearance,
    }),
    [appearance, resolved, colors, navigationTheme, setAppearance],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useKitchenTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useKitchenTheme must be used within KitchenThemeProvider");
  }
  return ctx;
}

export function applyAppearanceToOS(appearance: AppearancePref) {
  if (appearance === "light" || appearance === "dark") {
    Appearance.setColorScheme(appearance);
  }
}
