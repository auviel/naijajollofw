import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowDown } from "@/components/ui/icons";
import type { StoreProfile } from "@/lib/domain/store/types";

type FaqItem = {
  question: string;
  answer: ReactNode;
};

type StorefrontFaqProps = {
  store: StoreProfile;
  prepMinutes: number;
  todayLabel?: string;
};

function formatPhone(phone: string): string {
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

function buildFaqItems({
  store,
  prepMinutes,
  todayLabel,
}: StorefrontFaqProps): FaqItem[] {
  const phoneLabel = formatPhone(store.phone);
  const hoursLine = todayLabel
    ? `Today’s hours are ${todayLabel}.`
    : "Check the status at the top of the page for today’s hours.";

  return [
    {
      question: "Do you offer pickup and delivery?",
      answer: `Yes. At checkout you can choose pickup at ${store.name} in ${store.city}, or delivery to your address.`,
    },
    {
      question: "What are your hours?",
      answer: (
        <>
          {hoursLine} You can still browse the menu and add items when we’re
          closed — pick a pickup or delivery time at checkout. See{" "}
          <Link
            href="/hours"
            className="font-medium text-foreground underline-offset-2 hover:underline"
          >
            Hours &amp; ordering
          </Link>{" "}
          for the full week.
        </>
      ),
    },
    {
      question: "How long until my order is ready?",
      answer: `Most orders are ready in about ${prepMinutes} minutes once accepted. Delivery adds travel time after the kitchen finishes preparing your food.`,
    },
    {
      question: "Can I schedule an order for later?",
      answer:
        "Yes. When the restaurant is closed, you’ll choose a time at checkout. When we’re open, you can order ASAP or pick a later slot.",
    },
    {
      question: "How do I pay?",
      answer:
        "Pay online at checkout with a card. You’ll get an order confirmation and can track status from the link we provide after payment.",
    },
    {
      question: "What about special or pre-order only items?",
      answer:
        "Items marked for special or pre-order may need advance notice. Choose those from the menu, then we’ll confirm timing when we accept your order — or call us if you need a large catering tray.",
    },
    {
      question: "How can I contact the restaurant?",
      answer: `Call ${store.name} at ${phoneLabel}. For order issues after checkout, use the phone number on your confirmation or call the restaurant directly.`,
    },
  ];
}

export function StorefrontFaq({
  store,
  prepMinutes,
  todayLabel,
}: StorefrontFaqProps) {
  const items = buildFaqItems({ store, prepMinutes, todayLabel });

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

        <div className="mt-8 divide-y divide-border border-y border-border">
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
                {item.answer}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
