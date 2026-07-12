import type { ComponentType } from "react";
import {
  Addons,
  Calendar,
  Drink,
  Package,
  RiceBowl,
  Soup,
  Star,
} from "@/components/ui/icons";

type IconComponent = ComponentType<{ className?: string; size?: number }>;

/** Strip emoji / pictographs so labels stay clean beside Hugeicons. */
export function displayCategoryName(name: string) {
  return name
    .replace(/\p{Extended_Pictographic}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeCategoryName(name: string) {
  return displayCategoryName(name).toLowerCase();
}

/** Map a category label to a stroke Hugeicon (Featured has no icon). */
export function categoryIconFor(name: string): IconComponent | null {
  const n = normalizeCategoryName(name);

  if (n.startsWith("featured")) return null;
  if (n.includes("popular")) return Star;
  if (n.includes("rice")) return RiceBowl;
  if (n.includes("soup") || n.includes("stew")) return Soup;
  if (n.includes("side") || n.includes("add-on") || n.includes("addon")) {
    return Addons;
  }
  if (n.includes("family") || n.includes("tray") || n.includes("bulk")) {
    return Package;
  }
  if (n.includes("drink")) return Drink;
  if (n.includes("special")) return Calendar;

  return null;
}
