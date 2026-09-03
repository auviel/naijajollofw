import { Colors as LightColors, UiThemeProvider } from "@naijajollof/ui";
import { syncKitchenType } from "@/lib/kitchen/typography";
import { kvGet, kvSet } from "@/lib/kv";
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
  /** Lighter brand orange — readable as text/links on dark surfaces */
  accent: "#FF8F4A",
  accentHover: "#FFA86B",
  accentSoft: "#3A2418",
  secondary: "#D4D4D8",
  secondarySoft: "#27272A",
  success: "#4ADE80",
  successSoft: "#14532D",
  /** Coral red — readable on dark danger Soft fills */
  danger: "#F87171",
  dangerSoft: "#4A1C1C",
  inverse: "#FFFFFF",
} as typeof LightColors;

type ThemeContextValue = {
  appearance: AppearancePref;
  resolved: "light" | "dark";
  colors: typeof LightColors;
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

  // Keep typography + UI package tokens in sync for this render tree.
  syncKitchenType(colors);

  const value = useMemo(
    () => ({
      appearance,
      resolved,
      colors,
      setAppearance,
    }),
    [appearance, resolved, colors, setAppearance],
  );

  return (
    <ThemeContext.Provider value={value}>
      <UiThemeProvider colors={colors} scheme={resolved}>
        {children}
      </UiThemeProvider>
    </ThemeContext.Provider>
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
  if (appearance === "system") {
    // Clear any forced scheme so useColorScheme() tracks the OS again.
    // RN runtime accepts null; local typings may only list light|dark.
    Appearance.setColorScheme(null as never);
    return;
  }
  Appearance.setColorScheme(appearance);
}
