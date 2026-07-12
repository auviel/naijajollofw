"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { StoreBrandLogo } from "@/components/features/storefront/store-brand-logo";
import { Search, ShoppingBag, User, X } from "@/components/ui/icons";
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
  const [, startTransition] = useTransition();
  const [scrolled, setScrolled] = useState(false);
  const urlQuery = searchParams.get("q") ?? "";
  const [draftQuery, setDraftQuery] = useState<string | null>(null);
  const query = draftQuery ?? urlQuery;
  const setQuery = (value: string) => setDraftQuery(value);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const mobileSearchRef = useRef<HTMLInputElement>(null);

  const isLoggedIn = status === "authenticated" && Boolean(session?.user);
  const role = session?.user?.role;
  const accountHref = role === "STORE_MANAGER" ? "/dashboard" : "/account";
  const accountLabel =
    role === "STORE_MANAGER" ? "Dashboard" : "Account";

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

  const accountControl = (
    <Link
      href={accountHref}
      className="inline-flex h-10 w-10 items-center justify-center rounded-full text-foreground no-underline transition-colors hover:bg-surface"
      aria-label={accountLabel}
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
      <div className="flex h-14 w-full items-center gap-2 px-4 sm:h-16 sm:gap-4 sm:px-6 lg:px-8 xl:px-10">
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
              className="h-10 w-full rounded-full border-0 bg-surface pr-4 pl-9 text-sm text-foreground outline-none placeholder:text-text-tertiary focus-visible:ring-2 focus-visible:ring-accent/25"
            />
          </label>
        </div>

        {/* Default header row (hidden on mobile while search is open) */}
        <div
          className={cn(
            "min-w-0 flex-1 items-center justify-between gap-3 sm:gap-6 lg:gap-8",
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

          <div className="hidden min-w-0 flex-1 justify-center px-2 sm:flex lg:px-6">
            <label className="relative w-full max-w-2xl lg:max-w-3xl">
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
                className="h-10 w-full rounded-full border-0 bg-surface pr-4 pl-10 text-sm text-foreground outline-none placeholder:text-text-tertiary focus-visible:ring-2 focus-visible:ring-accent/25"
              />
            </label>
          </div>

          <nav className="flex shrink-0 items-center gap-1 sm:gap-2">
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
                <Link
                  href="/signin"
                  className="hidden px-2 text-sm font-medium text-foreground no-underline transition-opacity hover:opacity-70 sm:inline"
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="inline-flex h-9 items-center rounded-full bg-surface px-3.5 text-sm font-medium text-foreground no-underline transition-colors hover:bg-border sm:px-4"
                >
                  Sign up
                </Link>
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
