"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, Package, Store, UtensilsCrossed } from "@/components/ui/icons";
import { cn } from "@/lib/utils/cn";

const items = [
  {
    href: "/dashboard",
    label: "Orders",
    icon: ClipboardList,
    exact: true,
  },
  {
    href: "/dashboard/menu",
    label: "Menu",
    icon: UtensilsCrossed,
    exact: false,
  },
  {
    href: "/dashboard/orders?channel=courier",
    label: "Courier",
    icon: Package,
    exact: false,
  },
  {
    href: "/dashboard/store",
    label: "Store",
    icon: Store,
    exact: false,
  },
];

function isActive(pathname: string, href: string, exact: boolean) {
  if (exact) {
    return pathname === href || pathname.startsWith("/dashboard/orders");
  }

  if (href.startsWith("/dashboard/orders")) {
    return pathname.startsWith("/dashboard/deliveries");
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background safe-bottom md:hidden">
      <div className="grid grid-cols-4">
        {items.map(({ href, label, icon: Icon, exact }) => {
          const active = isActive(pathname, href, exact);

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 py-2.5 text-xs font-medium transition-colors duration-fast",
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
