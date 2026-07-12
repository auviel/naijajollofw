"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { ArrowDown, User } from "@/components/ui/icons";
import { signOutStaff } from "@/lib/auth/actions";
import { cn } from "@/lib/utils/cn";

export function SidebarProfileMenu() {
  const pathname = usePathname();
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const [open, setOpen] = useState(false);
  const isActive =
    pathname === "/dashboard/store" || pathname.startsWith("/dashboard/store/");

  useEffect(() => {
    if (!open) return;

    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors duration-fast",
          isActive || open
            ? "bg-surface-elevated text-foreground shadow-[inset_3px_0_0_0_var(--foreground)]"
            : "text-text-secondary hover:bg-surface-elevated hover:text-foreground",
        )}
      >
        <span
          className="flex h-5 w-5 shrink-0 items-center justify-center"
          aria-hidden
        >
          <User className="h-5 w-5" />
        </span>
        <span className="flex-1 text-left">Profile</span>
        <ArrowDown
          className={cn(
            "h-4 w-4 shrink-0 text-text-tertiary transition-transform duration-fast",
            // Closed: point up (menu opens above). Open: point down.
            !open && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      {open ? (
        <ul
          id={menuId}
          role="menu"
          className="absolute inset-x-0 bottom-full z-30 mb-2 overflow-hidden rounded-2xl border border-border bg-surface-elevated shadow-lg"
        >
          <li role="none">
            <Link
              role="menuitem"
              href="/dashboard/store"
              className="block px-3 py-2.5 text-sm font-medium text-foreground no-underline transition-colors hover:bg-surface"
              onClick={() => setOpen(false)}
            >
              Store profile
            </Link>
          </li>
          <li role="none" className="border-t border-border">
            <form action={signOutStaff}>
              <button
                type="submit"
                role="menuitem"
                className="block w-full px-3 py-2.5 text-left text-sm font-medium text-foreground transition-colors hover:bg-surface"
              >
                Sign out
              </button>
            </form>
          </li>
        </ul>
      ) : null}
    </div>
  );
}
