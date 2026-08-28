import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowDown } from "@/components/ui/icons";
import {
  buildStorefrontFaqEntries,
  type StorefrontFaqEntry,
} from "@/lib/seo/storefront-faq";
import { absoluteUrl } from "@/lib/seo/site";
import type { StoreProfile } from "@/lib/domain/store/types";

type StorefrontFaqProps = {
  store: StoreProfile;
  prepMinutes: number;
  todayLabel?: string;
};

function renderFaqAnswer(entry: StorefrontFaqEntry): ReactNode {
  const hoursUrl = absoluteUrl("/hours");
  if (entry.answer.includes(hoursUrl)) {
    const [before, after] = entry.answer.split(hoursUrl);
    return (
      <>
        {before}
        <Link
          href="/hours"
          className="font-medium text-foreground underline-offset-2 hover:underline"
        >
          Hours &amp; ordering
        </Link>
        {after}
      </>
    );
  }

  return entry.answer;
}

export function StorefrontFaq({
  store,
  prepMinutes,
  todayLabel,
}: StorefrontFaqProps) {
  const items = buildStorefrontFaqEntries({ store, prepMinutes, todayLabel });

  return (
    <section
      id="faq"
      aria-labelledby="faq-heading"
      className="mt-12 scroll-mt-24 border-t border-border pt-16 sm:mt-16 sm:pt-20"
    >
      <div className="w-full text-left">
        <h2
          id="faq-heading"
          className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
        >
          Frequently asked questions
        </h2>
        <p className="mt-2 text-sm text-text-secondary sm:text-[15px]">
          Ordering, pickup, delivery, and how {store.name} works online.
        </p>

        <div className="mt-8 divide-y divide-border rounded-2xl bg-surface-elevated px-5">
          {items.map((item) => (
            <details key={item.question} className="group py-1">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-left text-[15px] font-medium text-foreground outline-none transition-colors marker:content-none [&::-webkit-details-marker]:hidden focus-visible:text-accent">
                <span>{item.question}</span>
                <ArrowDown
                  className="h-5 w-5 shrink-0 text-text-tertiary transition-transform duration-200 group-open:rotate-180"
                  aria-hidden
                />
              </summary>
              <div className="pb-5 pr-8 text-sm leading-relaxed text-text-secondary sm:text-[15px]">
                {renderFaqAnswer(item)}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
