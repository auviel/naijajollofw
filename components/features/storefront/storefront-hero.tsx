import Image from "next/image";
import Link from "next/link";
import type { StoreOpenStatus } from "@/lib/domain/store/hours";
import { formatStoreProfileAddress } from "@/lib/domain/store/format";
import type { StoreProfile } from "@/lib/domain/store/types";
import { cn } from "@/lib/utils/cn";

export const STORE_HERO_SRC = "/brand/naija-jollof-hero.png";

type StorefrontHeroProps = {
  store: StoreProfile;
  openStatus: StoreOpenStatus;
  prepMinutes: number;
  /** When menu has no orderable items while open */
  soldOut?: boolean;
};

export function StorefrontHero({
  store,
  openStatus,
  prepMinutes,
  soldOut = false,
}: StorefrontHeroProps) {
  const address = formatStoreProfileAddress(store);

  return (
    <section className="pb-2 sm:pb-4">
      <div
        className={cn(
          "storefront-hero-banner relative overflow-hidden rounded-2xl sm:rounded-3xl",
          "bg-[linear-gradient(135deg,var(--accent-subtle)_0%,color-mix(in_oklab,var(--accent)_18%,white)_42%,color-mix(in_oklab,var(--success)_14%,white)_100%)]",
        )}
      >
        <div className="grid lg:min-h-[22rem] lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.15fr)] xl:min-h-[24rem]">
          {/* Food plane — top on mobile, right on desktop */}
          <div className="storefront-hero-cover relative order-1 aspect-[16/11] sm:aspect-[16/10] lg:order-2 lg:aspect-auto lg:min-h-full">
            <Image
              src={STORE_HERO_SRC}
              alt={`Food from ${store.name}`}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 55vw"
              className="object-cover object-[center_35%] lg:object-center"
            />
            {/* Blend photo into wash */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[color-mix(in_oklab,var(--accent-subtle)_88%,transparent)] via-transparent to-transparent lg:bg-gradient-to-r lg:from-[color-mix(in_oklab,var(--accent-subtle)_92%,transparent)] lg:via-[color-mix(in_oklab,var(--accent)_8%,transparent)] lg:to-transparent"
            />
          </div>

          {/* Brand copy — below image on mobile, left on desktop */}
          <div className="storefront-hero-copy relative order-2 flex flex-col justify-center px-5 py-6 sm:px-8 sm:py-8 lg:order-1 lg:px-10 lg:py-10 xl:px-12">
            <h1 className="font-display text-[1.875rem] font-semibold tracking-tight text-foreground sm:text-4xl lg:text-[2.65rem] lg:leading-[1.08]">
              {store.name}
            </h1>

            <p className="mt-3 max-w-sm text-sm leading-relaxed text-text-secondary sm:mt-4 sm:text-[15px]">
              Smoky jollof, rich stews, and party trays. Waterloo’s Naija kitchen.
            </p>

            <div className="mt-6 sm:mt-7">
              <Link
                href="/#menu"
                className="inline-flex h-12 min-h-12 w-auto items-center justify-center rounded-full bg-accent px-7 text-sm font-semibold text-text-inverse no-underline transition-colors hover:bg-accent-hover"
              >
                Order now
              </Link>
            </div>

            <Link
              href="/hours"
              className="mt-5 inline-flex max-w-full flex-wrap items-center gap-x-2 gap-y-1 text-sm text-text-secondary no-underline transition-colors hover:text-foreground sm:mt-6"
            >
              {openStatus.isOpen ? (
                <>
                  <span className="font-medium text-success">Open</span>
                  <span aria-hidden className="text-border-strong">
                    ·
                  </span>
                  <span>{openStatus.todayLabel}</span>
                  <span aria-hidden className="text-border-strong">
                    ·
                  </span>
                  <span>Ready in ~{prepMinutes} min</span>
                </>
              ) : openStatus.nextOpenLabel ? (
                <>
                  <span className="font-medium text-foreground">Closed</span>
                  <span aria-hidden className="text-border-strong">
                    ·
                  </span>
                  <span>Schedule for {openStatus.nextOpenLabel}</span>
                </>
              ) : (
                <span className="font-medium text-foreground">
                  {openStatus.message}
                </span>
              )}
            </Link>

            <a
              href="https://maps.app.goo.gl/wG9369vQfH76S6BYA"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 max-w-sm text-sm leading-relaxed text-text-secondary no-underline transition-colors hover:text-foreground hover:underline"
            >
              {address}
            </a>

            {openStatus.isOpen && soldOut ? (
              <p className="mt-3 text-sm text-text-secondary">
                Nothing is available to order right now. Items may be sold out.
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
