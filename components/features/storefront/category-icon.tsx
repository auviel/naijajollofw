import type { ComponentType } from "react";
import {
  CalendarFill,
  CookingPotFill,
  PackageFill,
  RiceBowlFill,
  SoftDrinkFill,
  SpoonAndForkFill,
  StarFill,
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

/** Map a category label to a filled Hugeicon (Featured has no icon). */
export function categoryIconFor(name: string): IconComponent | null {
  const n = normalizeCategoryName(name);

  if (n.startsWith("featured")) return null;
  if (n.includes("popular")) return StarFill;
  if (n.includes("rice")) return RiceBowlFill;
  if (n.includes("soup") || n.includes("stew")) return CookingPotFill;
  if (n.includes("side") || n.includes("add-on") || n.includes("addon")) {
    return SpoonAndForkFill;
  }
  if (n.includes("family") || n.includes("tray") || n.includes("bulk")) {
    return PackageFill;
  }
  if (n.includes("drink")) return SoftDrinkFill;
  if (n.includes("special")) return CalendarFill;

  return null;
}
