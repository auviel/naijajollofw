"use client";

import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { usePathname, useRouter } from "next/navigation";
import { AmakaAvatar } from "@/components/features/ai/amaka-avatar";
import { ViewOrderBar } from "@/components/features/storefront/view-order-bar";
import { useCartSummary } from "@/components/features/ai/amaka-chat-cart-bar";
import { useStorefrontUi } from "@/components/providers/storefront-ui-context";
import { Home, Search, ShoppingBag, ChatBubble } from "@/components/ui/icons";
import { easeOut, motionDuration } from "@/lib/motion/tokens";
import { cn } from "@/lib/utils/cn";

const HIDDEN_PREFIXES = [
  "/blog",
  "/cart",
  "/chat",
  "/checkout",
  "/item",
  "/signin",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
] as const;

function shouldHideNav(pathname: string) {
  return HIDDEN_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function StorefrontMobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { openMobileSearch, openCart, cartOpen, mobileSearchOpen, cartRevision } =
    useStorefrontUi();
  const { itemCount: cartItemCount, subtotalCents: cartSubtotalCents } =
    useCartSummary(cartRevision);
  const reduce = useReducedMotion();

  const menuActive = pathname === "/" && !cartOpen && !mobileSearchOpen;
  const cartActive =
    cartOpen || pathname === "/cart" || pathname.startsWith("/cart/");
  const chatActive = pathname === "/chat" || pathname.startsWith("/chat/");
  const showViewOrder = cartItemCount > 0;
  const hideNav = cartOpen || shouldHideNav(pathname);
  const hideForEmptySearch = mobileSearchOpen && cartItemCount === 0;

  function handleSearch() {
    openMobileSearch();
    if (pathname !== "/") {
      router.push("/");
    }
  }

  if (hideNav || hideForEmptySearch) {
    return null;
  }
  const chromeTransition = {
    duration: reduce ? motionDuration.fast : motionDuration.chrome,
    ease: easeOut,
  };

  return (
    <nav
      aria-label="Storefront"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] md:hidden"
    >
      <AnimatePresence mode="wait" initial={false}>
        {showViewOrder ? (
          <motion.div
            key="view-order"
            className="pointer-events-auto mx-auto flex w-full max-w-lg items-center gap-2"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
            transition={chromeTransition}
          >
            <div className="flex shrink-0 items-center gap-1.5 rounded-full bg-surface-elevated/95 p-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.08)] backdrop-blur-md">
              <button
                type="button"
                onClick={handleSearch}
                className="inline-flex size-11 items-center justify-center rounded-full text-foreground transition-colors hover:bg-surface"
                aria-label="Search menu"
              >
                <Search className="h-5 w-5" aria-hidden />
              </button>
              <Link
                href="/chat"
                className="inline-flex size-11 items-center justify-center rounded-full text-foreground no-underline transition-colors hover:bg-surface"
                aria-label="Ask Amaka"
                aria-current={chatActive ? "page" : undefined}
              >
                <AmakaAvatar size="sm" className="size-8 ring-0" />
              </Link>
            </div>
            <ViewOrderBar
              itemCount={cartItemCount}
              subtotalCents={cartSubtotalCents}
              onViewOrder={openCart}
            />
          </motion.div>
        ) : mobileSearchOpen ? null : (
          <motion.div
            key="tab-nav"
            className="pointer-events-auto mx-auto grid h-14 max-w-lg grid-cols-4 rounded-2xl bg-surface-elevated/95 shadow-[0_8px_24px_rgba(0,0,0,0.08)] backdrop-blur-md"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
            transition={chromeTransition}
          >
            <NavLink
              href="/"
              label="Menu"
              active={menuActive}
              icon={<Home className="h-5 w-5" aria-hidden />}
            />
            <button
              type="button"
              onClick={handleSearch}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors",
                "text-text-tertiary",
              )}
            >
              <Search className="h-5 w-5" aria-hidden />
              Search
            </button>
            <button
              type="button"
              onClick={openCart}
              className={cn(
                "relative flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors",
                cartActive ? "text-foreground" : "text-text-tertiary",
              )}
              aria-label={
                cartItemCount > 0
                  ? `Cart, ${cartItemCount} item${cartItemCount === 1 ? "" : "s"}`
                  : "Cart"
              }
              aria-current={cartActive ? "page" : undefined}
            >
              <span className="relative inline-flex">
                <ShoppingBag className="h-5 w-5" aria-hidden />
                {cartItemCount > 0 ? (
                  <span className="absolute -top-1.5 -right-2 flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-success px-0.5 text-[10px] font-semibold leading-none text-white">
                    {cartItemCount > 99 ? "99+" : cartItemCount}
                  </span>
                ) : null}
              </span>
              Cart
            </button>
            <NavLink
              href="/chat"
              label="Amaka"
              active={chatActive}
              icon={<ChatBubble className="h-5 w-5" aria-hidden />}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

function NavLink({
  href,
  label,
  active,
  icon,
}: {
  href: string;
  label: string;
  active: boolean;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "relative flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium no-underline transition-colors",
        active ? "text-foreground" : "text-text-tertiary",
      )}
      aria-current={active ? "page" : undefined}
    >
      {icon}
      {label}
    </Link>
  );
}
