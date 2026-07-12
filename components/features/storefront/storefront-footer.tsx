import Link from "next/link";
import { StoreBrandLogo } from "@/components/features/storefront/store-brand-logo";
import { formatStoreProfileAddress } from "@/lib/domain/store/format";
import { storeRepository } from "@/lib/db/repositories/store.repository";
import { resolvePublicStoreId } from "@/lib/services/storefront/resolve-public-store";

const YEAR = new Date().getFullYear();

export async function StorefrontFooter() {
  const storeId = await resolvePublicStoreId();
  const store = await storeRepository.getProfileById(storeId);
  const storeName = store?.name ?? "Restaurant";
  const address = store ? formatStoreProfileAddress(store) : null;
  const phone = store?.phone ?? null;

  return (
    <footer className="mt-auto border-t border-border bg-background">
      <div className="mx-auto w-full max-w-7xl px-4 pt-12 pb-8 sm:px-6 lg:px-8 lg:pt-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.2fr)_repeat(3,minmax(0,1fr))] lg:gap-12">
          <div className="max-w-xs">
            <Link
              href="/"
              className="inline-flex text-foreground no-underline"
              aria-label={storeName}
            >
              <StoreBrandLogo alt={storeName} variant="header" />
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-text-secondary">
              Order pickup or delivery from {storeName}.
            </p>
          </div>

          <FooterColumn title="Order">
            <FooterLink href="/#menu">Menu</FooterLink>
            <FooterLink href="/cart">Cart</FooterLink>
            <FooterLink href="/checkout">Checkout</FooterLink>
          </FooterColumn>

          <FooterColumn title="Restaurant">
            {address ? (
              <p className="text-sm leading-relaxed text-text-secondary">{address}</p>
            ) : null}
            {phone ? (
              <a
                href={`tel:${phone}`}
                className="block text-sm text-foreground no-underline transition-opacity hover:opacity-70"
              >
                {phone}
              </a>
            ) : null}
            <FooterLink href="/#menu">Hours & ordering</FooterLink>
          </FooterColumn>

          <FooterColumn title="Support">
            {phone ? (
              <a
                href={`tel:${phone}`}
                className="block text-sm text-foreground no-underline transition-opacity hover:opacity-70"
              >
                Call the restaurant
              </a>
            ) : (
              <span className="block text-sm text-text-secondary">Get help</span>
            )}
            <FooterLink href="/cart">View your cart</FooterLink>
          </FooterColumn>
        </div>

        <div className="mt-12 border-t border-border pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-text-secondary">
              <span className="cursor-default" title="Coming soon">
                Privacy Policy
              </span>
              <span className="cursor-default" title="Coming soon">
                Terms
              </span>
            </nav>
            <p className="text-sm text-text-tertiary">
              © {YEAR} {storeName}
            </p>
          </div>
          <p className="mt-4 text-xs text-text-tertiary">
            Powered by deliverGO
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-3 text-sm font-medium text-foreground">{title}</p>
      <div className="space-y-2.5">{children}</div>
    </div>
  );
}

function FooterLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="block text-sm text-foreground no-underline transition-opacity hover:opacity-70"
    >
      {children}
    </Link>
  );
}
