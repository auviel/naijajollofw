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

function resolveScheme(
  appearance: AppearancePref,
  system: string | null | undefined,
): "light" | "dark" {
  if (appearance === "light" || appearance === "dark") return appearance;
  return system === "dark" ? "dark" : "light";
}

export function KitchenThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const systemFromHook = useColorScheme();
  /** Keep a live OS reading — native tab chrome follows OS even when RN was forced. */
  const [systemScheme, setSystemScheme] = useState<"light" | "dark" | null>(
    () => (Appearance.getColorScheme() === "dark" ? "dark" : "light"),
  );
  const [appearance, setAppearanceState] = useState<AppearancePref>("system");

  useEffect(() => {
    // Drop any leftover Appearance.setColorScheme override from older builds so
    // System can track the real device setting again.
    Appearance.setColorScheme("unspecified");
  }, []);

  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(colorScheme === "dark" ? "dark" : "light");
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    setSystemScheme(systemFromHook === "dark" ? "dark" : "light");
  }, [systemFromHook]);

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
    // Never force RN's global color scheme — Light/Dark are app-only.
    // Forcing broke System (native tab bar followed OS dark while RN stayed light).
    Appearance.setColorScheme("unspecified");
  }, []);

  const system = systemScheme ?? systemFromHook;
  const resolved = resolveScheme(appearance, system);
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

/** Clears any RN color-scheme override so System can follow the device. */
export function applyAppearanceToOS(_appearance?: AppearancePref) {
  Appearance.setColorScheme("unspecified");
}
