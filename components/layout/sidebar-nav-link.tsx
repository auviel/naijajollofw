"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type SidebarNavLinkProps = {
  href: string;
  label: string;
  icon: ReactNode;
  exact?: boolean;
  /** Extra path prefixes that should mark this link active (e.g. /dashboard/orders). */
  matchPrefixes?: string[];
  excludePaths?: string[];
  /**
   * When set, this link is active only if the named search param equals
   * `matchSearchValue` (and path rules also match). Use for channel tabs.
   */
  matchSearchParam?: string;
  matchSearchValue?: string;
  /**
   * When set, this link is inactive if the named search param equals
   * `excludeSearchValue` (e.g. Orders should not light when channel=courier).
   */
  excludeSearchParam?: string;
  excludeSearchValue?: string;
};

export function SidebarNavLink({
  href,
  label,
  icon,
  exact = false,
  matchPrefixes = [],
  excludePaths = [],
  matchSearchParam,
  matchSearchValue,
  excludeSearchParam,
  excludeSearchValue,
}: SidebarNavLinkProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const pathOnly = href.split("?")[0] ?? href;
  const excluded = excludePaths.some((path) => pathname.startsWith(path));
  const matchedPrefix = matchPrefixes.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
  const pathActive =
    !excluded &&
    (matchedPrefix ||
      (exact
        ? pathname === pathOnly
        : pathname === pathOnly || pathname.startsWith(`${pathOnly}/`)));

  // Courier (and similar): require search param match, or deliveries routes.
  if (matchSearchParam && matchSearchValue) {
    const paramMatches =
      searchParams.get(matchSearchParam) === matchSearchValue;
    const deliveriesPath = pathname.startsWith("/dashboard/deliveries");
    const isActive = (pathActive && paramMatches) || deliveriesPath;

    return (
      <NavLinkShell href={href} label={label} icon={icon} isActive={isActive} />
    );
  }

  let isActive = pathActive;
  if (isActive && excludeSearchParam && excludeSearchValue) {
    if (searchParams.get(excludeSearchParam) === excludeSearchValue) {
      isActive = false;
    }
  }

  return (
    <NavLinkShell href={href} label={label} icon={icon} isActive={isActive} />
  );
}

function NavLinkShell({
  href,
  label,
  icon,
  isActive,
}: {
  href: string;
  label: string;
  icon: ReactNode;
  isActive: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors duration-fast",
        isActive
          ? "bg-surface-elevated text-foreground shadow-[inset_3px_0_0_0_var(--foreground)]"
          : "text-text-secondary hover:bg-surface-elevated hover:text-foreground",
      )}
      aria-current={isActive ? "page" : undefined}
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center" aria-hidden>
        {icon}
      </span>
      {label}
    </Link>
  );
}
