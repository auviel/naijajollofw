import { StoreBrandLogo } from "@/components/features/storefront/store-brand-logo";
import type { StoreOpenStatus } from "@/lib/domain/store/hours";
import { formatStoreProfileAddress } from "@/lib/domain/store/format";
import type { StoreProfile } from "@/lib/domain/store/types";
import { cn } from "@/lib/utils/cn";

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
  const statusLabel = openStatus.isOpen ? "Open" : "Closed";

  return (
    <section className="pb-2 sm:pb-4">
      <div className="grid items-end gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-10">
        <div className="relative order-1 lg:order-2">
          <div
            className={cn(
              "storefront-hero-cover relative overflow-hidden rounded-2xl bg-surface ring-1 ring-border",
              "aspect-[16/10] sm:aspect-[16/9] lg:aspect-auto lg:min-h-[280px] xl:min-h-[320px]",
            )}
            aria-hidden
          >
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(145deg, #eceae6 0%, #d8d4cc 42%, #c4bfb5 100%)",
              }}
            />
            <div
              className="absolute inset-0 opacity-40"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 20% 30%, rgba(255,255,255,0.55) 0%, transparent 45%), radial-gradient(circle at 80% 70%, rgba(0,0,0,0.06) 0%, transparent 40%)",
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-sm font-medium tracking-wide text-text-tertiary">
                Cover photo
              </p>
            </div>
          </div>

          {/* Mobile only: logo overlaps cover */}
          <div className="storefront-hero-logo absolute -bottom-5 left-4 shadow-[0_8px_24px_rgba(0,0,0,0.12)] lg:hidden">
            <StoreBrandLogo
              alt=""
              variant="hero"
              className="h-12 w-[11.5rem] sm:h-14 sm:w-[13rem]"
            />
          </div>
        </div>

        <div className="storefront-hero-copy order-2 pt-8 lg:order-1 lg:pt-0 lg:pb-2">
          <div className="mb-4 hidden lg:mb-5 lg:block">
            <StoreBrandLogo alt="" variant="hero" />
          </div>

          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-[2.75rem] lg:leading-[1.1]">
            {store.name}
          </h1>

          <p className="mt-3 max-w-md text-sm leading-relaxed text-text-secondary sm:text-[15px]">
            {address}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-text-secondary">
            <span
              className={cn(
                "font-medium",
                openStatus.isOpen ? "text-success" : "text-foreground",
              )}
            >
              {statusLabel}
            </span>
            <span aria-hidden className="text-border-strong">
              ·
            </span>
            <span>{openStatus.todayLabel}</span>
            {openStatus.isOpen ? (
              <>
                <span aria-hidden className="text-border-strong">
                  ·
                </span>
                <span>Ready in ~{prepMinutes} min</span>
              </>
            ) : null}
          </div>

          {!openStatus.isOpen ? (
            <p role="status" className="mt-4 max-w-md text-sm text-foreground">
              {openStatus.message}. You can browse the menu, but ordering is
              paused.
            </p>
          ) : null}

          {openStatus.isOpen && soldOut ? (
            <p role="status" className="mt-4 text-sm text-text-secondary">
              Nothing is available to order right now. Items may be sold out.
            </p>
          ) : null}

          <div className="mt-6">
            <a
              href="#menu"
              className="inline-flex h-11 items-center justify-center rounded-full bg-foreground px-5 text-sm font-medium text-background no-underline transition-opacity hover:opacity-90"
            >
              Browse menu
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
