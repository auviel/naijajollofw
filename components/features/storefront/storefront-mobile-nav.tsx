"use client";

import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { ViewOrderBar } from "@/components/features/storefront/view-order-bar";
import { useStorefrontUi } from "@/components/providers/storefront-ui-context";
import { Home, Search, ShoppingBag, User } from "@/components/ui/icons";
import { easeOut, motionDuration } from "@/lib/motion/tokens";
import { cn } from "@/lib/utils/cn";

type StorefrontMobileNavProps = {
  cartItemCount: number;
  cartSubtotalCents: number;
};

const HIDDEN_PREFIXES = [
  "/cart",
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

export function StorefrontMobileNav({
  cartItemCount,
  cartSubtotalCents,
}: StorefrontMobileNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const { openMobileSearch, openCart, cartOpen } = useStorefrontUi();
  const reduce = useReducedMotion();

  if (cartOpen || shouldHideNav(pathname)) {
    return null;
  }

  const isLoggedIn = status === "authenticated" && Boolean(session?.user);
  const role = session?.user?.role;
  const accountHref = isLoggedIn
    ? role === "STORE_MANAGER"
      ? "/dashboard"
      : "/account"
    : "/signup";

  const menuActive = pathname === "/" && !cartOpen;
  const cartActive = cartOpen || pathname === "/cart" || pathname.startsWith("/cart/");
  const accountActive =
    !cartOpen &&
    (pathname === "/account" ||
      pathname.startsWith("/account/") ||
      pathname === "/signin" ||
      pathname === "/signup");

  function handleSearch() {
    openMobileSearch();
    if (pathname !== "/") {
      router.push("/");
    }
  }

  const showViewOrder = cartItemCount > 0;
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
            className="pointer-events-auto mx-auto flex justify-center"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
            transition={chromeTransition}
          >
            <ViewOrderBar
              itemCount={cartItemCount}
              subtotalCents={cartSubtotalCents}
              onViewOrder={openCart}
            />
          </motion.div>
        ) : (
          <motion.div
            key="tab-nav"
            className="pointer-events-auto mx-auto grid h-14 max-w-lg grid-cols-4 rounded-xl border border-border bg-background/95 shadow-[0_8px_24px_rgba(0,0,0,0.08)] backdrop-blur-md"
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
              aria-current={cartActive ? "page" : undefined}
            >
              <span className="relative inline-flex">
                <ShoppingBag className="h-5 w-5" aria-hidden />
              </span>
              Cart
            </button>
            <NavLink
              href={accountHref}
              label="Account"
              active={accountActive}
              icon={<User className="h-5 w-5" aria-hidden />}
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
