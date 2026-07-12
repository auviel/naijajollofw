import {
  Add01Icon,
  ArrowDown01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Calendar01Icon,
  CallIcon,
  Cancel01Icon,
  ClipboardListIcon,
  Clock01Icon,
  Facebook01Icon,
  Home01Icon,
  IceCubesIcon,
  InstagramIcon,
  LeftToRightListDashIcon,
  LinkSquare01Icon,
  Location01Icon,
  NoodlesIcon,
  Package01Icon,
  RiceBowl01Icon,
  Search01Icon,
  SearchRemoveIcon,
  ShoppingCart01Icon,
  SoftDrink01Icon,
  SpoonAndForkIcon,
  StarIcon,
  Store01Icon,
  Tick02Icon,
  UserIcon,
  UserMultipleIcon,
  WhatsappIcon,
  YoutubeIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import type { ComponentPropsWithoutRef } from "react";

type IconProps = Omit<ComponentPropsWithoutRef<"svg">, "ref" | "children" | "strokeWidth"> & {
  size?: number;
  strokeWidth?: number;
};

function inferSizeFromClassName(className: string | undefined): number | undefined {
  if (!className) return undefined;
  const match = className.match(/(?:^|\s)(?:h|size)-(\d+(?:\.\d+)?)/);
  if (!match) return undefined;
  return Number(match[1]) * 4;
}

function createIcon(icon: IconSvgElement, displayName: string) {
  function Icon({ className, size, strokeWidth = 1.5, ...props }: IconProps) {
    const resolvedSize = size ?? inferSizeFromClassName(className) ?? 24;

    return (
      <HugeiconsIcon
        icon={icon}
        size={resolvedSize}
        strokeWidth={strokeWidth}
        color="currentColor"
        className={className}
        {...props}
      />
    );
  }

  Icon.displayName = displayName;
  return Icon;
}

/** Filled (solid) look — free pack is stroke-only; fill the closed paths. */
function createFilledIcon(icon: IconSvgElement, displayName: string) {
  function Icon({ className, size, strokeWidth = 0, ...props }: IconProps) {
    const resolvedSize = size ?? inferSizeFromClassName(className) ?? 24;

    return (
      <HugeiconsIcon
        icon={icon}
        size={resolvedSize}
        strokeWidth={strokeWidth}
        color="currentColor"
        fill="currentColor"
        className={className}
        {...props}
      />
    );
  }

  Icon.displayName = displayName;
  return Icon;
}

/** Stroke Rounded icons via Hugeicons — Lucide-compatible names for app usage. */
export const Plus = createIcon(Add01Icon, "Plus");
export const ArrowDown = createIcon(ArrowDown01Icon, "ArrowDown");
export const ArrowLeft = createIcon(ArrowLeft01Icon, "ArrowLeft");
export const Calendar = createIcon(Calendar01Icon, "Calendar");
export const Call = createIcon(CallIcon, "Call");
export const Check = createIcon(Tick02Icon, "Check");
export const ChevronLeft = createIcon(ArrowLeft01Icon, "ChevronLeft");
export const ChevronRight = createIcon(ArrowRight01Icon, "ChevronRight");
export const ClipboardList = createIcon(ClipboardListIcon, "ClipboardList");
export const Clock = createIcon(Clock01Icon, "Clock");
export const ExternalLink = createIcon(LinkSquare01Icon, "ExternalLink");
export const Home = createIcon(Home01Icon, "Home");
export const List = createIcon(LeftToRightListDashIcon, "List");
export const Location = createIcon(Location01Icon, "Location");
export const Package = createIcon(Package01Icon, "Package");
export const Search = createIcon(Search01Icon, "Search");
export const SearchX = createIcon(SearchRemoveIcon, "SearchX");
export const ShoppingBag = createIcon(ShoppingCart01Icon, "ShoppingBag");
export const Store = createIcon(Store01Icon, "Store");
export const User = createIcon(UserIcon, "User");
export const Users = createIcon(UserMultipleIcon, "Users");
export const UtensilsCrossed = createIcon(SpoonAndForkIcon, "UtensilsCrossed");
export const X = createIcon(Cancel01Icon, "X");
export const WhatsApp = createIcon(WhatsappIcon, "WhatsApp");
export const Facebook = createIcon(Facebook01Icon, "Facebook");
export const Instagram = createIcon(InstagramIcon, "Instagram");
export const YouTube = createIcon(YoutubeIcon, "YouTube");

/** Menu category icons (filled) */
export const StarFill = createFilledIcon(StarIcon, "StarFill");
export const RiceBowlFill = createFilledIcon(RiceBowl01Icon, "RiceBowlFill");
export const SoupFill = createFilledIcon(NoodlesIcon, "SoupFill");
export const AddonsFill = createFilledIcon(IceCubesIcon, "AddonsFill");
export const PackageFill = createFilledIcon(Package01Icon, "PackageFill");
export const SoftDrinkFill = createFilledIcon(SoftDrink01Icon, "SoftDrinkFill");
export const CalendarFill = createFilledIcon(Calendar01Icon, "CalendarFill");
