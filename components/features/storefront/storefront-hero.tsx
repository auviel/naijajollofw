import Image from "next/image";
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
      <div className="grid items-center gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-10 xl:gap-12">
        <div className="relative order-1 lg:order-2">
          <div
            className={cn(
              "storefront-hero-cover relative overflow-hidden rounded-2xl bg-surface ring-1 ring-border",
              "aspect-[16/10] sm:aspect-[16/9] lg:aspect-[4/3]",
            )}
          >
            <Image
              src={STORE_HERO_SRC}
              alt={`Food from ${store.name}`}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 55vw"
              className="object-cover object-center"
            />
          </div>
        </div>

        <div className="storefront-hero-copy order-2 flex flex-col justify-center lg:order-1 lg:min-h-0 lg:py-2">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-[2.75rem] lg:leading-[1.1]">
            {store.name}
          </h1>

          <p className="mt-3 max-w-md text-sm leading-relaxed text-text-secondary sm:mt-4 sm:text-[15px]">
            <a
              href="https://maps.app.goo.gl/wG9369vQfH76S6BYA"
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-secondary no-underline transition-colors hover:text-foreground hover:underline"
            >
              {address}
            </a>
          </p>

          <p
            role="status"
            className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-text-secondary sm:mt-5"
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
          </p>

          {openStatus.isOpen && soldOut ? (
            <p className="mt-3 text-sm text-text-secondary">
              Nothing is available to order right now. Items may be sold out.
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
