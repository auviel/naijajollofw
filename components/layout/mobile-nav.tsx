"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Package, Plus, Store } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const items = [
  {
    href: "/dashboard/deliveries",
    label: "Deliveries",
    icon: Package,
    excludePaths: ["/dashboard/deliveries/new"],
  },
  { href: "/dashboard/deliveries/new", label: "New", icon: Plus, excludePaths: [] },
  { href: "/dashboard/store", label: "Store", icon: Store, excludePaths: [] },
];

function isActive(pathname: string, href: string, excludePaths: string[]) {
  if (excludePaths.some((path) => pathname.startsWith(path))) {
    return false;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background safe-bottom md:hidden">
      <div className="grid grid-cols-3">
        {items.map(({ href, label, icon: Icon, excludePaths }) => {
          const active = isActive(pathname, href, excludePaths);

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
