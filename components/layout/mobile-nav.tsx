"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  ClipboardList,
  Package,
  Store,
  Users,
  UtensilsCrossed,
} from "@/components/ui/icons";
import { cn } from "@/lib/utils/cn";

type NavItem = {
  href: string;
  label: string;
  icon: typeof ClipboardList;
  kind: "orders" | "menu" | "courier" | "customers" | "store";
};

const items: NavItem[] = [
  {
    href: "/dashboard",
    label: "Orders",
    icon: ClipboardList,
    kind: "orders",
  },
  {
    href: "/dashboard/menu",
    label: "Menu",
    icon: UtensilsCrossed,
    kind: "menu",
  },
  {
    href: "/dashboard/orders?channel=courier",
    label: "Courier",
    icon: Package,
    kind: "courier",
  },
  {
    href: "/dashboard/customers",
    label: "Customers",
    icon: Users,
    kind: "customers",
  },
  {
    href: "/dashboard/store",
    label: "Profile",
    icon: Store,
    kind: "store",
  },
];

function isNavActive(
  kind: NavItem["kind"],
  pathname: string,
  channel: string | null,
): boolean {
  const onOrdersList =
    pathname === "/dashboard/orders" ||
    pathname.startsWith("/dashboard/orders/");
  const onDeliveries = pathname.startsWith("/dashboard/deliveries");
  const courierChannel = channel === "courier";

  switch (kind) {
    case "orders":
      if (pathname === "/dashboard") {
        return true;
      }
      if (onOrdersList && !courierChannel) {
        return true;
      }
      return false;
    case "courier":
      return onDeliveries || (onOrdersList && courierChannel);
    case "menu":
      return (
        pathname === "/dashboard/menu" ||
        pathname.startsWith("/dashboard/menu/")
      );
    case "customers":
      return (
        pathname === "/dashboard/customers" ||
        pathname.startsWith("/dashboard/customers/")
      );
    case "store":
      return (
        pathname === "/dashboard/store" ||
        pathname.startsWith("/dashboard/store/") ||
        pathname === "/dashboard/hours" ||
        pathname.startsWith("/dashboard/hours/")
      );
    default:
      return false;
  }
}

export function MobileNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const channel = searchParams.get("channel");

  return (
    <nav
      aria-label="Staff"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] md:hidden"
    >
      <div className="pointer-events-auto mx-auto grid h-14 max-w-lg grid-cols-5 rounded-2xl border border-border bg-background/95 shadow-[0_8px_24px_rgba(0,0,0,0.08)] backdrop-blur-md">
        {items.map(({ href, label, icon: Icon, kind }) => {
          const active = isNavActive(kind, pathname, channel);

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "relative flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium no-underline transition-colors",
                active ? "text-foreground" : "text-text-tertiary",
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon className="h-5 w-5" aria-hidden />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
