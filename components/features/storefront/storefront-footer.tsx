import Link from "next/link";
import { StoreBrandLogo } from "@/components/features/storefront/store-brand-logo";
import {
  Call,
  Facebook,
  Instagram,
  Location,
  WhatsApp,
  YouTube,
} from "@/components/ui/icons";
import { storeRepository } from "@/lib/db/repositories/store.repository";
import type { StoreProfile } from "@/lib/domain/store/types";
import { resolvePublicStoreId } from "@/lib/services/storefront/resolve-public-store";

const YEAR = new Date().getFullYear();

const SOCIAL_PROFILES = [
  {
    label: "Facebook",
    href: "https://www.facebook.com/Naijajolloftoronto",
    Icon: Facebook,
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/naijajolloftoronto/",
    Icon: Instagram,
  },
  {
    label: "YouTube",
    href: "https://www.youtube.com/@naijajolloftoronto500",
    Icon: YouTube,
  },
] as const;

function whatsappHref(phone: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) return null;
  return `https://wa.me/${digits}`;
}

function formatFooterAddress(store: StoreProfile): string {
  const line2 = store.addressLine2 ? `, ${store.addressLine2}` : "";
  return `${store.addressLine1}${line2}, ${store.city}, ${store.province}`;
}

function formatFooterPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    const local = digits.slice(1);
    return `(${local.slice(0, 3)}) ${local.slice(3, 6)}-${local.slice(6)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

export async function StorefrontFooter() {
  const storeId = await resolvePublicStoreId();
  const store = await storeRepository.getProfileById(storeId);
  const storeName = store?.name ?? "Restaurant";
  const address = store ? formatFooterAddress(store) : null;
  const phone = store?.phone ?? null;
  const phoneLabel = phone ? formatFooterPhone(phone) : null;
  const whatsapp = whatsappHref(phone);
  const socialLinks = [
    ...(whatsapp
      ? [{ label: "WhatsApp", href: whatsapp, Icon: WhatsApp }]
      : []),
    ...SOCIAL_PROFILES,
  ];

  return (
    <footer className="mt-auto border-t border-border bg-background pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))] md:pb-0">
      <div className="mx-auto w-full max-w-7xl px-4 pt-14 pb-10 sm:px-6 lg:px-8 lg:pt-16">
        <div className="flex flex-col gap-12 lg:flex-row lg:justify-between lg:gap-20">
          <div className="shrink-0 lg:w-64">
            <Link
              href="/"
              className="inline-flex text-foreground no-underline"
              aria-label={storeName}
            >
              <StoreBrandLogo
                alt={storeName}
                variant="header"
                className="h-10 w-[9.5rem] sm:h-11 sm:w-[10.5rem]"
              />
            </Link>
            <p className="mt-5 max-w-[16rem] text-sm leading-relaxed text-text-secondary">
              Smoky jollof and Nigerian favorites, made for Waterloo.
            </p>
            <nav
              aria-label="Social media"
              className="mt-5 flex items-center gap-1"
            >
              {socialLinks.map(({ label, href, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full text-text-secondary no-underline transition-colors hover:bg-surface hover:text-foreground"
                  aria-label={label}
                >
                  <Icon className="h-5 w-5" aria-hidden />
                </a>
              ))}
            </nav>
          </div>

          <div className="grid grid-cols-2 gap-x-10 gap-y-10 sm:grid-cols-3 sm:gap-x-14 lg:min-w-0 lg:flex-1 lg:justify-items-start lg:gap-x-16 xl:max-w-3xl">
            <FooterColumn title="Quicklinks">
              <FooterLink href="/#menu">Menu</FooterLink>
              <FooterLink href="/cart">Cart</FooterLink>
              <FooterLink href="/checkout">Checkout</FooterLink>
              <FooterLink href="/blog">Blog</FooterLink>
            </FooterColumn>

            <FooterColumn title="Restaurant">
              {address ? (
                <a
                  href="https://maps.app.goo.gl/wG9369vQfH76S6BYA"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex gap-2 text-sm leading-relaxed text-text-secondary no-underline transition-colors hover:text-foreground"
                >
                  <Location
                    className="mt-0.5 h-4 w-4 shrink-0 text-text-tertiary"
                    aria-hidden
                  />
                  <span>{address}</span>
                </a>
              ) : null}
              {phone && phoneLabel ? (
                <a
                  href={`tel:${phone}`}
                  className="flex items-start gap-2 text-sm text-text-secondary no-underline transition-colors hover:text-foreground"
                >
                  <Call
                    className="mt-0.5 h-4 w-4 shrink-0 text-text-tertiary"
                    aria-hidden
                  />
                  <span>{phoneLabel}</span>
                </a>
              ) : null}
            </FooterColumn>

            <FooterColumn title="Support" className="col-span-2 sm:col-span-1">
              {phone ? (
                <a
                  href={`tel:${phone}`}
                  className="block text-sm text-text-secondary no-underline transition-colors hover:text-foreground"
                >
                  Call the restaurant
                </a>
              ) : null}
              <FooterLink href="/#faq">FAQ</FooterLink>
              <FooterLink href="/hours">Hours &amp; ordering</FooterLink>
            </FooterColumn>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <nav
            aria-label="Legal"
            className="flex shrink-0 items-center gap-6 text-sm text-text-secondary"
          >
            <Link
              href="/privacy-policy"
              className="text-text-secondary no-underline transition-colors hover:text-foreground"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms-and-conditions"
              className="text-text-secondary no-underline transition-colors hover:text-foreground"
            >
              Terms
            </Link>
          </nav>
          <p className="shrink-0 text-sm whitespace-nowrap text-text-tertiary sm:text-right">
            © {YEAR} {storeName}. Designed by{" "}
            <a
              href="https://auviel.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-tertiary no-underline transition-colors hover:text-foreground"
            >
              Auviel
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="mb-4 text-sm font-medium text-foreground">{title}</p>
      <div className="space-y-3">{children}</div>
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
      className="block text-sm text-text-secondary no-underline transition-colors hover:text-foreground"
    >
      {children}
    </Link>
  );
}
