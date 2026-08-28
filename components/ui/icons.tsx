import {
  Add01Icon,
  AiSearch02Icon,
  ArrowDown01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  ArrowUp01Icon,
  Calendar01Icon,
  BubbleChatIcon,
  CallIcon,
  Cancel01Icon,
  CheckmarkCircle01Icon,
  ClipboardListIcon,
  Clock01Icon,
  CookingPotIcon,
  Delete02Icon,
  DeliveryTruck01Icon,
  HandshakeIcon,
  DrinkIcon,
  EyeIcon,
  Facebook01Icon,
  Folder01Icon,
  Home01Icon,
  Image01Icon,
  IceCubesIcon,
  InstagramIcon,
  LeftToRightListDashIcon,
  Link01Icon,
  LinkSquare01Icon,
  NewTwitterIcon,
  Location01Icon,
  Logout01Icon,
  MoreHorizontalIcon,
  Notification01Icon,
  NoodlesIcon,
  Package01Icon,
  RiceBowl01Icon,
  Scooter01Icon,
  Search01Icon,
  SearchRemoveIcon,
  SentIcon,
  ShoppingBagCheckIcon,
  ShoppingCart01Icon,
  SpoonAndForkIcon,
  StarIcon,
  Store01Icon,
  Tick02Icon,
  UserIcon,
  UserMultipleIcon,
  ViewOffIcon,
  WhatsappIcon,
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

/** Stroke Rounded icons via Hugeicons — Lucide-compatible names for app usage. */
export const Plus = createIcon(Add01Icon, "Plus");
export const AiSearch02 = createIcon(AiSearch02Icon, "AiSearch02");
export const ArrowDown = createIcon(ArrowDown01Icon, "ArrowDown");
export const ArrowLeft = createIcon(ArrowLeft01Icon, "ArrowLeft");
export const ArrowUp = createIcon(ArrowUp01Icon, "ArrowUp");
export const Calendar = createIcon(Calendar01Icon, "Calendar");
export const Call = createIcon(CallIcon, "Call");
export const ChatBubble = createIcon(BubbleChatIcon, "ChatBubble");
export const Check = createIcon(Tick02Icon, "Check");
export const CheckCircle = createIcon(CheckmarkCircle01Icon, "CheckCircle");
export const CookingPot = createIcon(CookingPotIcon, "CookingPot");
export const ChevronLeft = createIcon(ArrowLeft01Icon, "ChevronLeft");
export const ChevronRight = createIcon(ArrowRight01Icon, "ChevronRight");
export const ClipboardList = createIcon(ClipboardListIcon, "ClipboardList");
export const Clock = createIcon(Clock01Icon, "Clock");
export const DeliveryTruck = createIcon(DeliveryTruck01Icon, "DeliveryTruck");
export const Eye = createIcon(EyeIcon, "Eye");
export const EyeOff = createIcon(ViewOffIcon, "EyeOff");
export const ExternalLink = createIcon(LinkSquare01Icon, "ExternalLink");
export const Folder = createIcon(Folder01Icon, "Folder");
export const Handshake = createIcon(HandshakeIcon, "Handshake");
export const Image = createIcon(Image01Icon, "Image");
export const Home = createIcon(Home01Icon, "Home");
export const List = createIcon(LeftToRightListDashIcon, "List");
export const Location = createIcon(Location01Icon, "Location");
export const LogOut = createIcon(Logout01Icon, "LogOut");
export const MoreHorizontal = createIcon(MoreHorizontalIcon, "MoreHorizontal");
export const Bell = createIcon(Notification01Icon, "Bell");
export const Package = createIcon(Package01Icon, "Package");
export const Scooter = createIcon(Scooter01Icon, "Scooter");
export const Search = createIcon(Search01Icon, "Search");
export const SearchX = createIcon(SearchRemoveIcon, "SearchX");
export const Send = createIcon(SentIcon, "Send");
export const ShoppingBag = createIcon(ShoppingCart01Icon, "ShoppingBag");
export const ShoppingBagCheck = createIcon(ShoppingBagCheckIcon, "ShoppingBagCheck");
export const Store = createIcon(Store01Icon, "Store");
export const Trash = createIcon(Delete02Icon, "Trash");
export const User = createIcon(UserIcon, "User");
export const Users = createIcon(UserMultipleIcon, "Users");
export const UtensilsCrossed = createIcon(SpoonAndForkIcon, "UtensilsCrossed");
export const X = createIcon(Cancel01Icon, "X");
export const WhatsApp = createIcon(WhatsappIcon, "WhatsApp");
export const Instagram = createIcon(InstagramIcon, "Instagram");
export const Facebook = createIcon(Facebook01Icon, "Facebook");
export const Link = createIcon(Link01Icon, "Link");
export const XTwitter = createIcon(NewTwitterIcon, "XTwitter");

/** Menu category icons (stroke) */
export const Star = createIcon(StarIcon, "Star");
export const RiceBowl = createIcon(RiceBowl01Icon, "RiceBowl");
export const Soup = createIcon(NoodlesIcon, "Soup");
export const Addons = createIcon(IceCubesIcon, "Addons");
export const Drink = createIcon(DrinkIcon, "Drink");
