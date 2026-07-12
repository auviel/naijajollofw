"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { useStorefrontUi } from "@/components/providers/storefront-ui-context";
import { Home, Search, ShoppingBag, User } from "@/components/ui/icons";
import { cn } from "@/lib/utils/cn";

type StorefrontMobileNavProps = {
  cartItemCount: number;
};

const HIDDEN_PREFIXES = [
  "/checkout",
  "/item",
  "/forgot-password",
  "/reset-password",
] as const;

function shouldHideNav(pathname: string) {
  return HIDDEN_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function StorefrontMobileNav({ cartItemCount }: StorefrontMobileNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const { openMobileSearch } = useStorefrontUi();

  if (shouldHideNav(pathname)) {
    return null;
  }

  const isLoggedIn = status === "authenticated" && Boolean(session?.user);
  const role = session?.user?.role;
  const accountHref = isLoggedIn
    ? role === "STORE_MANAGER"
      ? "/dashboard"
      : "/account"
    : "/signup";

  const menuActive = pathname === "/";
  const cartActive = pathname === "/cart" || pathname.startsWith("/cart/");
  const accountActive =
    pathname === "/account" ||
    pathname.startsWith("/account/") ||
    pathname === "/signin" ||
    pathname === "/signup";

  function handleSearch() {
    openMobileSearch();
    if (pathname !== "/") {
      router.push("/");
    }
  }

  return (
    <nav
      aria-label="Storefront"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] md:hidden"
    >
      <div className="pointer-events-auto mx-auto grid h-14 max-w-lg grid-cols-4 rounded-xl border border-border bg-background/95 shadow-[0_8px_24px_rgba(0,0,0,0.08)] backdrop-blur-md">
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
        <NavLink
          href="/cart"
          label="Cart"
          active={cartActive}
          icon={<ShoppingBag className="h-5 w-5" aria-hidden />}
          badge={cartItemCount > 0 ? cartItemCount : null}
        />
        <NavLink
          href={accountHref}
          label="Account"
          active={accountActive}
          icon={<User className="h-5 w-5" aria-hidden />}
        />
      </div>
    </nav>
  );
}

function NavLink({
  href,
  label,
  active,
  icon,
  badge = null,
}: {
  href: string;
  label: string;
  active: boolean;
  icon: React.ReactNode;
  badge?: number | null;
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
      <span className="relative inline-flex">
        {icon}
        {badge != null ? (
          <span className="absolute -top-1.5 -right-2.5 flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-success px-1 text-[10px] font-semibold leading-none text-white">
            {badge > 99 ? "99+" : badge}
          </span>
        ) : null}
      </span>
      {label}
    </Link>
  );
}
