import { Colors } from "@naijajollof/ui";
import { Platform, type TextStyle } from "react-native";

/**
 * Kitchen typography — system fonts only (SF Pro / Roboto).
 * Weights stay in 400–700; avoid 800 everywhere so the board feels modern, not heavy.
 *
 * Colors follow the active kitchen theme via `syncKitchenType` (called from
 * KitchenThemeProvider). Prefer reading `KType.*` during render, not baking
 * them into module-level StyleSheet.create color fields.
 */
const base: TextStyle =
  Platform.select({
    ios: {
      // Default system = SF Pro
    },
    android: {
      fontFamily: "sans-serif",
    },
    default: {},
  }) ?? {};

type Palette = typeof Colors;

function createKType(colors: Palette) {
  return {
    /** Small label (“Staff”, “Coming next”) — neutral, not brand-washed */
    kicker: {
      ...base,
      fontSize: 11,
      fontWeight: "600" as const,
      letterSpacing: 0.7,
      textTransform: "uppercase" as const,
      color: colors.textSecondary,
    } satisfies TextStyle,

    /** Screen titles (store name, Menu, Account name) */
    page: {
      ...base,
      fontSize: 22,
      fontWeight: "700" as const,
      letterSpacing: -0.35,
      color: colors.text,
    } satisfies TextStyle,

    /** Ticket detail hero number */
    title: {
      ...base,
      fontSize: 20,
      fontWeight: "700" as const,
      letterSpacing: -0.3,
      color: colors.text,
    } satisfies TextStyle,

    /** Section headers (Later, Total) */
    section: {
      ...base,
      fontSize: 16,
      fontWeight: "600" as const,
      letterSpacing: -0.1,
      color: colors.text,
    } satisfies TextStyle,

    /** Ticket # on cards */
    ticket: {
      ...base,
      fontSize: 17,
      fontWeight: "700" as const,
      letterSpacing: -0.2,
      color: colors.text,
    } satisfies TextStyle,

    /** Primary reading text */
    body: {
      ...base,
      fontSize: 15,
      fontWeight: "400" as const,
      lineHeight: 21,
      color: colors.text,
    } satisfies TextStyle,

    /** Customer name, emphasized body */
    bodyStrong: {
      ...base,
      fontSize: 15,
      fontWeight: "600" as const,
      color: colors.text,
    } satisfies TextStyle,

    /** Secondary lines */
    meta: {
      ...base,
      fontSize: 13,
      fontWeight: "400" as const,
      lineHeight: 18,
      color: colors.textSecondary,
    } satisfies TextStyle,

    /** Meta that needs a bit more presence (notes) */
    metaStrong: {
      ...base,
      fontSize: 13,
      fontWeight: "500" as const,
      lineHeight: 18,
      color: colors.textSecondary,
    } satisfies TextStyle,

    /** Segmented control / compact UI chrome */
    label: {
      ...base,
      fontSize: 13,
      fontWeight: "600" as const,
      color: colors.text,
    } satisfies TextStyle,

    /** Badge counts, tiny chrome */
    caption: {
      ...base,
      fontSize: 12,
      fontWeight: "600" as const,
      color: colors.textSecondary,
    } satisfies TextStyle,

    /** Money / totals — tabular for alignment */
    numeric: {
      ...base,
      fontSize: 15,
      fontWeight: "600" as const,
      fontVariant: ["tabular-nums"] as TextStyle["fontVariant"],
      color: colors.text,
    } satisfies TextStyle,

    /** Wait chip on cards */
    wait: {
      ...base,
      fontSize: 12,
      fontWeight: "600" as const,
      fontVariant: ["tabular-nums"] as TextStyle["fontVariant"],
      color: colors.accent,
    } satisfies TextStyle,

    /** Primary bump CTA */
    action: {
      ...base,
      fontSize: 15,
      fontWeight: "600" as const,
      letterSpacing: -0.1,
      color: colors.accent,
    } satisfies TextStyle,

    /** Tab bar */
    tab: {
      ...base,
      fontSize: 11,
      fontWeight: "600" as const,
    } satisfies TextStyle,
  };
}

type KTypeMap = ReturnType<typeof createKType>;

let live: KTypeMap = createKType(Colors);

/** Live typography tokens — always read during render after theme sync. */
export const KType: KTypeMap = new Proxy({} as KTypeMap, {
  get(_target, prop: string | symbol) {
    return live[prop as keyof KTypeMap];
  },
});

export function syncKitchenType(colors: Palette) {
  live = createKType(colors);
}
