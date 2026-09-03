import { Colors } from "@naijajollof/ui";
import { Platform, type TextStyle } from "react-native";

/**
 * Kitchen typography — system fonts only (SF Pro / Roboto).
 * Weights stay in 400–700; avoid 800 everywhere so the board feels modern, not heavy.
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

export const KType = {
  /** Small label (“Staff”, “Coming next”) — neutral, not brand-washed */
  kicker: {
    ...base,
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.7,
    textTransform: "uppercase",
    color: Colors.textSecondary,
  } satisfies TextStyle,

  /** Screen titles (store name, Menu, Account name) */
  page: {
    ...base,
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.35,
    color: Colors.text,
  } satisfies TextStyle,

  /** Ticket detail hero number */
  title: {
    ...base,
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.3,
    color: Colors.text,
  } satisfies TextStyle,

  /** Section headers (Later, Total) */
  section: {
    ...base,
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: -0.1,
    color: Colors.text,
  } satisfies TextStyle,

  /** Ticket # on cards */
  ticket: {
    ...base,
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.2,
    color: Colors.text,
  } satisfies TextStyle,

  /** Primary reading text */
  body: {
    ...base,
    fontSize: 15,
    fontWeight: "400",
    lineHeight: 21,
    color: Colors.text,
  } satisfies TextStyle,

  /** Customer name, emphasized body */
  bodyStrong: {
    ...base,
    fontSize: 15,
    fontWeight: "600",
    color: Colors.text,
  } satisfies TextStyle,

  /** Secondary lines */
  meta: {
    ...base,
    fontSize: 13,
    fontWeight: "400",
    lineHeight: 18,
    color: Colors.textSecondary,
  } satisfies TextStyle,

  /** Meta that needs a bit more presence (notes) */
  metaStrong: {
    ...base,
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18,
    color: Colors.textSecondary,
  } satisfies TextStyle,

  /** Segmented control / compact UI chrome */
  label: {
    ...base,
    fontSize: 13,
    fontWeight: "600",
    color: Colors.text,
  } satisfies TextStyle,

  /** Badge counts, tiny chrome */
  caption: {
    ...base,
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textSecondary,
  } satisfies TextStyle,

  /** Money / totals — tabular for alignment */
  numeric: {
    ...base,
    fontSize: 15,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
    color: Colors.text,
  } satisfies TextStyle,

  /** Wait chip on cards */
  wait: {
    ...base,
    fontSize: 12,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
    color: Colors.accent,
  } satisfies TextStyle,

  /** Primary bump CTA */
  action: {
    ...base,
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: -0.1,
    color: Colors.accent,
  } satisfies TextStyle,

  /** Tab bar */
  tab: {
    ...base,
    fontSize: 11,
    fontWeight: "600",
  } satisfies TextStyle,
} as const;
