"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
};

export function SidebarNavLink({
  href,
  label,
  icon,
  exact = false,
  matchPrefixes = [],
  excludePaths = [],
}: SidebarNavLinkProps) {
  const pathname = usePathname();
  const excluded = excludePaths.some((path) => pathname.startsWith(path));
  const matchedPrefix = matchPrefixes.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
  const isActive =
    !excluded &&
    (matchedPrefix ||
      (exact
        ? pathname === href
        : pathname === href || pathname.startsWith(`${href}/`)));

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
