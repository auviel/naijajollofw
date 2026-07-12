import Link from "next/link";
import {
  dayOfWeekLabel,
  getInstantInTimeZone,
  type StoreHoursDay,
  type StoreHoursSchedule,
  type StoreOpenStatus,
} from "@/lib/domain/store/hours";
import type { StoreProfile } from "@/lib/domain/store/types";
import { cn } from "@/lib/utils/cn";

type HoursOrderingViewProps = {
  store: StoreProfile;
  openStatus: StoreOpenStatus;
  schedule: StoreHoursSchedule;
  prepMinutes: number;
};

function dayHoursLabel(day: StoreHoursDay): string {
  if (day.closed || !day.openTime || !day.closeTime) {
    return "Closed";
  }
  return `${day.openTime} – ${day.closeTime}`;
}

export function HoursOrderingView({
  store,
  openStatus,
  schedule,
  prepMinutes,
}: HoursOrderingViewProps) {
  const todayDow = getInstantInTimeZone(new Date(), schedule.timezone).dayOfWeek;

  return (
    <article className="mx-auto w-full max-w-3xl pb-8">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
        Hours &amp; ordering
      </h1>
      <p className="mt-2 text-[15px] leading-relaxed text-text-secondary">
        When {store.name} is open, and how pickup and delivery work online.
      </p>

      <section
        aria-labelledby="hours-status-heading"
        className="mt-10 rounded-2xl border border-border bg-surface px-5 py-5 sm:px-6"
      >
        <h2 id="hours-status-heading" className="sr-only">
          Current status
        </h2>
        {openStatus.isOpen ? (
          <p className="text-base font-semibold text-success">Open now</p>
        ) : (
          <p className="text-base font-semibold text-foreground">Closed now</p>
        )}
        <p className="mt-1 text-sm text-text-secondary">
          {openStatus.isOpen
            ? `Today ${openStatus.todayLabel}`
            : openStatus.nextOpenLabel
              ? `Opens ${openStatus.nextOpenLabel}`
              : openStatus.message}
        </p>
        <p className="mt-3 text-sm text-text-secondary">
          Typical prep time ~{prepMinutes} minutes after we accept your order.
        </p>
      </section>

      <section aria-labelledby="weekly-hours-heading" className="mt-12">
        <h2
          id="weekly-hours-heading"
          className="font-display text-xl font-semibold text-foreground"
        >
          Weekly hours
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          All times in local restaurant time
          {schedule.timezone ? ` (${schedule.timezone.replace(/_/g, " ")})` : ""}
          .
        </p>

        <ul className="mt-5 divide-y divide-border border-y border-border">
          {schedule.days.map((day) => {
            const isToday = day.dayOfWeek === todayDow;
            const closed =
              day.closed || !day.openTime || !day.closeTime;
            return (
              <li
                key={day.dayOfWeek}
                className={cn(
                  "flex items-baseline justify-between gap-4 py-3.5 text-[15px]",
                  isToday && "font-semibold text-foreground",
                )}
              >
                <span
                  className={cn(
                    !isToday && "text-foreground",
                    isToday && "text-foreground",
                  )}
                >
                  {dayOfWeekLabel(day.dayOfWeek)}
                  {isToday ? (
                    <span className="ml-2 text-xs font-medium text-accent">
                      Today
                    </span>
                  ) : null}
                </span>
                <span
                  className={cn(
                    "tabular-nums",
                    closed ? "text-text-tertiary" : "text-text-secondary",
                    isToday && !closed && "text-foreground",
                  )}
                >
                  {dayHoursLabel(day)}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="ordering-heading" className="mt-12">
        <h2
          id="ordering-heading"
          className="font-display text-xl font-semibold text-foreground"
        >
          How ordering works
        </h2>
        <ul className="mt-5 space-y-4 text-[15px] leading-relaxed text-text-secondary">
          <li>
            <span className="font-medium text-foreground">Browse anytime.</span>{" "}
            You can explore the menu and add items even when the kitchen is
            closed.
          </li>
          <li>
            <span className="font-medium text-foreground">
              Schedule when closed.
            </span>{" "}
            At checkout, pick a pickup or delivery time for when we&apos;re
            open.
          </li>
          <li>
            <span className="font-medium text-foreground">ASAP when open.</span>{" "}
            Order for as soon as possible, or choose a later slot the same day.
          </li>
          <li>
            <span className="font-medium text-foreground">
              Pickup or delivery.
            </span>{" "}
            Choose at checkout — pickup at {store.name} in {store.city}, or
            delivery to your address.
          </li>
        </ul>
      </section>

      <div className="mt-12 flex flex-wrap gap-x-6 gap-y-3 text-sm font-medium">
        <Link
          href="/#menu"
          className="text-accent no-underline transition-opacity hover:opacity-80"
        >
          Browse the menu
        </Link>
        <Link
          href="/#faq"
          className="text-text-secondary no-underline transition-colors hover:text-foreground"
        >
          FAQ
        </Link>
      </div>
    </article>
  );
}
