"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
} from "react";
import { StoreBrandLogo } from "@/components/features/storefront/store-brand-logo";
import { CartAddedPopoverHost } from "@/components/features/storefront/cart-added-popover";
import { ItemDetailModal } from "@/components/features/storefront/item-detail-modal";
import { MenuSearchSuggest } from "@/components/features/storefront/menu-search-suggest";
import { useStorefrontUi } from "@/components/providers/storefront-ui-context";
import { ArrowLeft, Search, ShoppingBag, User, X } from "@/components/ui/icons";
import type { MenuSearchIndex, MenuSearchItem } from "@/lib/domain/menu/search";
import { cn } from "@/lib/utils/cn";

type StorefrontHeaderBarProps = {
  storeName: string;
  cartItemCount: number;
  searchIndex: MenuSearchIndex;
};

export function StorefrontHeaderBar({
  storeName,
  cartItemCount,
  searchIndex,
}: StorefrontHeaderBarProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const { mobileSearchOpen, setMobileSearchOpen } = useStorefrontUi();
  const [scrolled, setScrolled] = useState(false);
  const urlQuery = searchParams.get("q") ?? "";
  const [draftQuery, setDraftQuery] = useState<string | null>(null);
  const [syncedUrlQuery, setSyncedUrlQuery] = useState(urlQuery);
  if (urlQuery !== syncedUrlQuery) {
    setSyncedUrlQuery(urlQuery);
    setDraftQuery(null);
  }
  const query = draftQuery ?? urlQuery;
  const setQuery = (value: string) => setDraftQuery(value);
  const mobileSearchRef = useRef<HTMLInputElement>(null);
  const desktopSearchRef = useRef<HTMLInputElement>(null);
  const [desktopSuggestOpen, setDesktopSuggestOpen] = useState(false);
  const [openItemId, setOpenItemId] = useState<string | null>(null);
  const suggestListId = useId();

  const isLoggedIn = status === "authenticated" && Boolean(session?.user);
  const role = session?.user?.role;
  const accountHref = role === "STORE_MANAGER" ? "/dashboard" : "/account";
  const accountLabel =
    role === "STORE_MANAGER" ? "Dashboard" : "Account";

  const applySearchQuery = useCallback(
    (next: string, options?: { scrollToMenu?: boolean }) => {
      const trimmed = next.trim();
      setDraftQuery(trimmed);
      setDesktopSuggestOpen(false);
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
        if (pathname === "/" && options?.scrollToMenu !== false) {
          requestAnimationFrame(() => {
            document.getElementById("menu")?.scrollIntoView({
              behavior: "smooth",
              block: "start",
            });
          });
        } else if (pathname !== "/") {
          router.push(`/?${params.toString()}`);
        }
      });
    },
    [pathname, router, startTransition],
  );

  const closeMobileSearch = useCallback(() => {
    setMobileSearchOpen(false);
    setDraftQuery("");
    if ((searchParams.get("q") ?? "").trim()) {
      startTransition(() => {
        router.replace("/", { scroll: false });
      });
    }
  }, [router, searchParams, setMobileSearchOpen, startTransition]);

  useEffect(() => {
    if (!mobileSearchOpen) return;
    mobileSearchRef.current?.focus();
  }, [mobileSearchOpen]);

  // Auto-open mobile search when landing with ?q= on small viewports.
  useEffect(() => {
    if (!urlQuery.trim()) return;
    if (typeof window === "undefined") return;
    if (window.matchMedia("(min-width: 640px)").matches) return;
    setMobileSearchOpen(true);
  }, [urlQuery, setMobileSearchOpen]);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 8);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Debounced URL sync while typing (mobile always; desktop when suggest closed / applied).
  useEffect(() => {
    const trimmed = query.trim();
    const current = (searchParams.get("q") ?? "").trim();
    if (trimmed === current && (pathname === "/" || trimmed === "")) {
      return;
    }
    // Desktop: don't push URL on every keystroke while the suggest panel is open —
    // selecting a row or pressing Enter applies immediately.
    if (desktopSuggestOpen && !mobileSearchOpen) {
      return;
    }

    const timeout = window.setTimeout(() => {
      startTransition(() => {
        if (!trimmed) {
          if (pathname === "/" && current) {
            router.replace("/", { scroll: false });
          }
          return;
        }
        const params = new URLSearchParams();
        params.set("q", trimmed);
        if (pathname === "/") {
          router.replace(`/?${params.toString()}`, { scroll: false });
          document.getElementById("menu")?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        } else {
          router.push(`/?${params.toString()}`);
        }
      });
    }, 280);

    return () => window.clearTimeout(timeout);
  }, [
    query,
    pathname,
    router,
    searchParams,
    startTransition,
    desktopSuggestOpen,
    mobileSearchOpen,
  ]);

  const accountControl = (
    <Link
      href={accountHref}
      className="inline-flex h-10 w-10 items-center justify-center rounded-full text-foreground no-underline transition-colors hover:bg-surface"
      aria-label={accountLabel}
    >
      <User className="h-5 w-5" aria-hidden />
    </Link>
  );

  function handleSelectItem(item: MenuSearchItem) {
    setDesktopSuggestOpen(false);
    if (window.matchMedia("(min-width: 1024px)").matches) {
      setOpenItemId(item.id);
      return;
    }
    router.push(`/item/${item.id}`);
  }

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-20 border-b bg-background/90 pt-[env(safe-area-inset-top,0px)] backdrop-blur-md transition-[border-color,box-shadow] duration-normal ease-out",
          scrolled
            ? "border-border shadow-[0_1px_0_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.04)]"
            : "border-transparent",
        )}
      >
        <div className="flex h-[var(--storefront-header-height)] w-full items-center gap-2 px-4 sm:gap-4 sm:px-6 lg:px-8 xl:px-10">
          <div
            className={cn(
              "min-w-0 flex-1 items-center gap-1 sm:hidden",
              mobileSearchOpen ? "flex" : "hidden",
            )}
          >
            <button
              type="button"
              onClick={closeMobileSearch}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-foreground transition-colors hover:bg-surface"
              aria-label="Back"
            >
              <ArrowLeft className="h-5 w-5" aria-hidden />
            </button>
            <label className="relative block min-w-0 flex-1">
              <span className="sr-only">Search menu</span>
              <input
                ref={mobileSearchRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Search in ${storeName}`}
                className="h-10 w-full rounded-full border-0 bg-surface py-0 pr-10 pl-4 text-base text-foreground outline-none placeholder:text-text-tertiary focus-visible:ring-2 focus-visible:ring-accent/25 [&::-webkit-search-cancel-button]:hidden"
                enterKeyHint="search"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    applySearchQuery(query);
                  }
                }}
              />
              {query.trim() ? (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    startTransition(() => {
                      router.replace("/", { scroll: false });
                    });
                    mobileSearchRef.current?.focus();
                  }}
                  className="absolute top-1/2 right-2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-border/80 text-foreground"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" aria-hidden />
                </button>
              ) : null}
            </label>
          </div>

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

            <div className="relative hidden min-w-0 flex-1 justify-center px-2 sm:flex lg:px-6">
              <label className="relative w-full max-w-2xl lg:max-w-3xl">
                <span className="sr-only">Search menu</span>
                <Search
                  className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-text-tertiary"
                  aria-hidden
                />
                <input
                  ref={desktopSearchRef}
                  type="search"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setDesktopSuggestOpen(true);
                  }}
                  onFocus={() => {
                    if (query.trim()) setDesktopSuggestOpen(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setDesktopSuggestOpen(false);
                      desktopSearchRef.current?.blur();
                      return;
                    }
                    if (e.key === "Enter") {
                      e.preventDefault();
                      applySearchQuery(query);
                    }
                    if (
                      e.key === "ArrowDown" &&
                      desktopSuggestOpen &&
                      query.trim()
                    ) {
                      e.preventDefault();
                      document
                        .getElementById(suggestListId)
                        ?.querySelector<HTMLElement>('[role="option"] button')
                        ?.focus();
                    }
                  }}
                  placeholder={`Search in ${storeName}`}
                  className="h-10 w-full rounded-full border-0 bg-surface py-0 pr-10 pl-10 text-base text-foreground outline-none placeholder:text-text-tertiary focus-visible:ring-2 focus-visible:ring-accent/25 [&::-webkit-search-cancel-button]:hidden"
                  aria-autocomplete="list"
                  aria-controls={suggestListId}
                  aria-expanded={desktopSuggestOpen && Boolean(query.trim())}
                />
                {query.trim() ? (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      setDesktopSuggestOpen(false);
                      startTransition(() => {
                        router.replace("/", { scroll: false });
                      });
                      desktopSearchRef.current?.focus();
                    }}
                    className="absolute top-1/2 right-2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-border/80 text-foreground"
                    aria-label="Clear search"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden />
                  </button>
                ) : null}
                <MenuSearchSuggest
                  open={desktopSuggestOpen}
                  query={query}
                  searchIndex={searchIndex}
                  listId={suggestListId}
                  onClose={() => setDesktopSuggestOpen(false)}
                  onSelectKeyword={(keyword) => applySearchQuery(keyword)}
                  onSearchForQuery={(q) => applySearchQuery(q)}
                  onSelectItem={handleSelectItem}
                  className="hidden sm:block"
                />
              </label>
            </div>

            <nav className="hidden shrink-0 items-center gap-1 sm:flex sm:gap-2">
              <CartLink count={cartItemCount} />

              {status === "loading" ? (
                <span
                  className="h-9 w-16 rounded-full bg-surface sm:w-24"
                  aria-hidden
                />
              ) : isLoggedIn ? (
                accountControl
              ) : (
                <>
                  <Link
                    href="/signin"
                    className="px-2 text-sm font-medium text-foreground no-underline transition-opacity hover:opacity-70"
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
      <div
        className="shrink-0"
        style={{ height: "var(--storefront-header-offset)" }}
        aria-hidden
      />
      <ItemDetailModal
        open={openItemId !== null}
        itemId={openItemId}
        onClose={() => setOpenItemId(null)}
      />
    </>
  );
}

function CartLink({ count }: { count: number }) {
  const { openCart, dismissAddedToCart } = useStorefrontUi();
  const label = count === 1 ? "Cart, 1 item" : `Cart, ${count} items`;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={openCart}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-foreground transition-colors hover:bg-surface"
        aria-label={label}
      >
        <ShoppingBag className="h-5 w-5" aria-hidden />
        {count > 0 ? (
          <span className="absolute -top-0.5 -right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-success px-1 text-[11px] font-semibold leading-none text-white">
            {count > 99 ? "99+" : count}
          </span>
        ) : null}
      </button>
      <CartAddedPopoverHost
        onViewCart={() => {
          dismissAddedToCart();
          openCart();
        }}
      />
    </div>
  );
}
