"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { StoreBrandLogo } from "@/components/features/storefront/store-brand-logo";
import { Search, ShoppingBag, User, X } from "@/components/ui/icons";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils/cn";

type StorefrontHeaderBarProps = {
  storeName: string;
  cartItemCount: number;
};

export function StorefrontHeaderBar({
  storeName,
  cartItemCount,
}: StorefrontHeaderBarProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { success } = useToast();
  const [, startTransition] = useTransition();
  const [scrolled, setScrolled] = useState(false);
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const mobileSearchRef = useRef<HTMLInputElement>(null);

  const isLoggedIn = status === "authenticated" && Boolean(session?.user);

  useEffect(() => {
    setQuery(searchParams.get("q") ?? "");
  }, [searchParams]);

  useEffect(() => {
    if (!mobileSearchOpen) {
      return;
    }
    mobileSearchRef.current?.focus();
  }, [mobileSearchOpen]);

  useEffect(() => {
    const scroller =
      document.getElementById("storefront-scroll") ?? window;
    const readTop = () =>
      scroller instanceof Window
        ? scroller.scrollY
        : (scroller as HTMLElement).scrollTop;

    const onScroll = () => {
      setScrolled(readTop() > 8);
    };
    onScroll();
    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => scroller.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    const current = (searchParams.get("q") ?? "").trim();
    if (trimmed === current && (pathname === "/" || trimmed === "")) {
      return;
    }

    const timeout = window.setTimeout(() => {
      startTransition(() => {
        if (!trimmed) {
          if (pathname === "/") {
            router.replace("/", { scroll: false });
          }
          return;
        }
        const params = new URLSearchParams();
        params.set("q", trimmed);
        router.replace(`/?${params.toString()}`, { scroll: false });
        if (pathname === "/") {
          document.getElementById("menu")?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }
      });
    }, 280);

    return () => window.clearTimeout(timeout);
  }, [query, pathname, router, searchParams]);

  function comingSoon() {
    success("Guest accounts coming soon — you can order as a guest.");
  }

  const accountControl = (
    <Link
      href="/dashboard"
      className="inline-flex h-10 w-10 items-center justify-center rounded-full text-foreground no-underline transition-colors hover:bg-surface"
      aria-label="Account"
    >
      <User className="h-5 w-5" aria-hidden />
    </Link>
  );

  return (
    <header
      className={cn(
        "sticky top-0 z-20 border-b bg-background/90 backdrop-blur-md transition-[border-color,box-shadow] duration-normal ease-out",
        scrolled
          ? "border-border shadow-[0_1px_0_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.04)]"
          : "border-transparent",
      )}
    >
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-2 px-4 sm:h-16 sm:gap-4 sm:px-6 lg:px-8">
        {/* Mobile expanded search */}
        <div
          className={cn(
            "min-w-0 flex-1 items-center gap-1 sm:hidden",
            mobileSearchOpen ? "flex" : "hidden",
          )}
        >
          <button
            type="button"
            onClick={() => setMobileSearchOpen(false)}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-foreground transition-colors hover:bg-surface"
            aria-label="Close search"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
          <label className="relative block min-w-0 flex-1">
            <span className="sr-only">Search menu</span>
            <Search
              className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-text-tertiary"
              aria-hidden
            />
            <input
              ref={mobileSearchRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search in ${storeName}`}
              className="h-10 w-full rounded-full border-0 bg-surface pr-4 pl-9 text-sm text-foreground outline-none placeholder:text-text-tertiary focus-visible:ring-2 focus-visible:ring-foreground/20"
            />
          </label>
        </div>

        {/* Default header row (hidden on mobile while search is open) */}
        <div
          className={cn(
            "min-w-0 flex-1 items-center gap-2 sm:gap-4",
            mobileSearchOpen ? "hidden sm:flex" : "flex",
          )}
        >
          <Link
            href="/"
            className="flex min-w-0 shrink-0 items-center text-foreground no-underline"
            aria-label={storeName}
          >
            <StoreBrandLogo alt={storeName} variant="header" priority />
          </Link>

          <label className="relative hidden min-w-0 flex-1 sm:block">
            <span className="sr-only">Search menu</span>
            <Search
              className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-text-tertiary"
              aria-hidden
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search in ${storeName}`}
              className="h-10 w-full rounded-full border-0 bg-surface pr-4 pl-10 text-sm text-foreground outline-none placeholder:text-text-tertiary focus-visible:ring-2 focus-visible:ring-foreground/20"
            />
          </label>

          <nav className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1">
            <button
              type="button"
              onClick={() => setMobileSearchOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-foreground transition-colors hover:bg-surface sm:hidden"
              aria-label="Search menu"
            >
              <Search className="h-5 w-5" aria-hidden />
            </button>

            <CartLink count={cartItemCount} />

            {status === "loading" ? (
              <span className="h-9 w-16 rounded-full bg-surface sm:w-24" aria-hidden />
            ) : isLoggedIn ? (
              accountControl
            ) : (
              <>
                <button
                  type="button"
                  onClick={comingSoon}
                  className="hidden px-2 text-sm font-medium text-foreground transition-opacity hover:opacity-70 sm:inline"
                >
                  Log in
                </button>
                <button
                  type="button"
                  onClick={comingSoon}
                  className="inline-flex h-9 items-center rounded-full bg-surface px-3.5 text-sm font-medium text-foreground transition-colors hover:bg-border sm:px-4"
                >
                  Sign up
                </button>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}

function CartLink({ count }: { count: number }) {
  const label = count === 1 ? "Cart, 1 item" : `Cart, ${count} items`;

  return (
    <Link
      href="/cart"
      className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-foreground no-underline transition-colors hover:bg-surface"
      aria-label={label}
    >
      <ShoppingBag className="h-5 w-5" aria-hidden />
      <span className="absolute -top-0.5 -right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-success px-1 text-[11px] font-semibold leading-none text-white">
        {count > 99 ? "99+" : count}
      </span>
    </Link>
  );
}
