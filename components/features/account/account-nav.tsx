"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { DinerSignOutButton } from "@/components/features/storefront/diner-sign-out-button";
import { ChevronRight } from "@/components/ui/icons";
import { cn } from "@/lib/utils/cn";

const NAV = [
  { href: "/account", label: "Overview", match: (p: string) => p === "/account" },
  {
    href: "/account/orders",
    label: "Orders",
    match: (p: string) => p.startsWith("/account/orders"),
  },
  {
    href: "/account/address",
    label: "Address",
    match: (p: string) => p.startsWith("/account/address"),
  },
  {
    href: "/account/payment",
    label: "Payment",
    match: (p: string) => p.startsWith("/account/payment"),
  },
  {
    href: "/account/security",
    label: "Security",
    match: (p: string) => p.startsWith("/account/security"),
  },
] as const;

export function AccountNav({ userName }: { userName: string }) {
  const pathname = usePathname();
  const active = NAV.find((item) => item.match(pathname)) ?? NAV[0];
  // Open only while path matches — closes automatically on navigation.
  const [openPath, setOpenPath] = useState<string | null>(null);
  const open = openPath === pathname;
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpenPath(null);
      }
    }
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [open]);

  return (
    <>
      {/* Mobile dropdown */}
      <div ref={rootRef} className="relative md:hidden">
        <p className="text-sm text-text-secondary">Hi, {userName}</p>
        <button
          type="button"
          className="mt-2 flex h-12 w-full items-center justify-between rounded-2xl border border-border bg-background px-4 text-left text-sm font-semibold text-foreground"
          aria-expanded={open}
          aria-controls={listId}
          onClick={() =>
            setOpenPath((current) => (current === pathname ? null : pathname))
          }
        >
          {active.label}
          <ChevronRight
            className={cn(
              "h-4 w-4 text-text-tertiary transition-transform",
              open && "rotate-90",
            )}
            aria-hidden
          />
        </button>
        {open ? (
          <ul
            id={listId}
            className="absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-border bg-background shadow-lg"
          >
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "block px-4 py-3 text-sm no-underline transition-colors",
                    item.match(pathname)
                      ? "bg-accent-subtle font-semibold text-accent"
                      : "font-medium text-foreground hover:bg-surface",
                  )}
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li className="border-t border-border px-4 py-3">
              <DinerSignOutButton />
            </li>
          </ul>
        ) : null}
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden w-56 shrink-0 md:block lg:w-60">
        <p className="text-xs font-semibold tracking-wide text-text-tertiary uppercase">
          Account
        </p>
        <p className="mt-1 truncate text-sm text-text-secondary">{userName}</p>
        <nav className="mt-5 flex flex-col gap-0.5" aria-label="Account">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-2xl px-3 py-2.5 text-sm no-underline transition-colors",
                item.match(pathname)
                  ? "bg-accent-subtle font-semibold text-accent"
                  : "font-medium text-text-secondary hover:bg-surface hover:text-foreground",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-6 border-t border-border pt-4">
          <DinerSignOutButton />
        </div>
      </aside>
    </>
  );
}
