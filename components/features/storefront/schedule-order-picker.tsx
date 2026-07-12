"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronRight, X } from "@/components/ui/icons";
import type { StoreHoursDay } from "@/lib/domain/store/hours";
import {
  buildScheduleDays,
  buildScheduleSlotsForDay,
  type ScheduleDayOption,
} from "@/lib/domain/store/schedule-slots";
import { cn } from "@/lib/utils/cn";

type ScheduleOrderPickerProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: (scheduledForIso: string) => void;
  storeName: string;
  fulfillmentType: "pickup" | "delivery";
  days: StoreHoursDay[];
  timeZone: string;
  /** e.g. "opens at 11:00" for subtitle */
  opensHint?: string | null;
  initialScheduledFor?: string | null;
};

export function ScheduleOrderPicker(props: ScheduleOrderPickerProps) {
  if (!props.open) {
    return null;
  }

  return (
    <ScheduleOrderPickerBody
      key={props.initialScheduledFor ?? "fresh"}
      {...props}
    />
  );
}

function resolveInitialSelection(
  dayOptions: ScheduleDayOption[],
  days: StoreHoursDay[],
  timeZone: string,
  initialScheduledFor: string | null,
): { day: ScheduleDayOption | null; slot: string | null } {
  const first = dayOptions[0] ?? null;
  if (!first) {
    return { day: null, slot: null };
  }

  if (initialScheduledFor) {
    for (const day of dayOptions) {
      const slots = buildScheduleSlotsForDay({
        dateKey: day.dateKey,
        dayOfWeek: day.dayOfWeek,
        days,
        timeZone,
      });
      const match = slots.find(
        (slot) =>
          Math.abs(
            new Date(slot.startAt).getTime() -
              new Date(initialScheduledFor).getTime(),
          ) <= 60_000,
      );
      if (match) {
        return { day, slot: match.startAt };
      }
    }
  }

  const slots = buildScheduleSlotsForDay({
    dateKey: first.dateKey,
    dayOfWeek: first.dayOfWeek,
    days,
    timeZone,
  });
  return { day: first, slot: slots[0]?.startAt ?? null };
}

function ScheduleOrderPickerBody({
  onClose,
  onConfirm,
  storeName,
  fulfillmentType,
  days,
  timeZone,
  opensHint = null,
  initialScheduledFor = null,
}: ScheduleOrderPickerProps) {
  const dayOptions = useMemo(
    () => buildScheduleDays(days, timeZone),
    [days, timeZone],
  );

  const initial = useMemo(
    () =>
      resolveInitialSelection(
        dayOptions,
        days,
        timeZone,
        initialScheduledFor,
      ),
    [dayOptions, days, timeZone, initialScheduledFor],
  );

  const [selectedDay, setSelectedDay] = useState(initial.day);
  const [selectedSlot, setSelectedSlot] = useState(initial.slot);
  const [dayScrollIndex, setDayScrollIndex] = useState(0);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  const slots = useMemo(() => {
    if (!selectedDay) {
      return [];
    }
    return buildScheduleSlotsForDay({
      dateKey: selectedDay.dateKey,
      dayOfWeek: selectedDay.dayOfWeek,
      days,
      timeZone,
    });
  }, [selectedDay, days, timeZone]);

  const visibleDays = dayOptions.slice(dayScrollIndex, dayScrollIndex + 3);
  const canScrollMore = dayScrollIndex + 3 < dayOptions.length;
  const title =
    fulfillmentType === "delivery" ? "Schedule delivery" : "Schedule pickup";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="schedule-picker-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-background shadow-xl sm:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative border-b border-border px-5 pt-4 pb-4">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 left-3 inline-flex h-10 w-10 items-center justify-center rounded-full text-foreground hover:bg-surface"
            aria-label="Close"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
          <div className="pt-8">
            <h2
              id="schedule-picker-title"
              className="font-display text-2xl font-semibold text-foreground"
            >
              {title}
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              {opensHint
                ? `${storeName} ${opensHint}`
                : `${storeName} — choose a time`}
            </p>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div className="flex items-stretch gap-2">
            <div className="flex min-w-0 flex-1 gap-2 overflow-hidden">
              {visibleDays.map((day) => {
                const active = selectedDay?.dateKey === day.dateKey;
                return (
                  <button
                    key={day.dateKey}
                    type="button"
                    onClick={() => {
                      setSelectedDay(day);
                      const nextSlots = buildScheduleSlotsForDay({
                        dateKey: day.dateKey,
                        dayOfWeek: day.dayOfWeek,
                        days,
                        timeZone,
                      });
                      setSelectedSlot(nextSlots[0]?.startAt ?? null);
                    }}
                    className={cn(
                      "min-w-0 flex-1 rounded-xl border px-3 py-3 text-left transition-colors",
                      active
                        ? "border-foreground bg-background"
                        : "border-border bg-surface text-text-secondary hover:border-border-strong",
                    )}
                  >
                    <span className="block text-sm font-semibold text-foreground">
                      {day.label}
                    </span>
                  </button>
                );
              })}
            </div>
            {canScrollMore ? (
              <button
                type="button"
                onClick={() => setDayScrollIndex((value) => value + 1)}
                className="inline-flex h-auto w-11 shrink-0 items-center justify-center rounded-full border border-border bg-background text-foreground hover:bg-surface"
                aria-label="More dates"
              >
                <ChevronRight className="h-5 w-5" aria-hidden />
              </button>
            ) : null}
          </div>

          <div className="mt-4 divide-y divide-border rounded-xl border border-border">
            {slots.length === 0 ? (
              <p className="px-4 py-6 text-sm text-text-secondary">
                No times available for this day.
              </p>
            ) : (
              slots.map((slot) => {
                const checked = selectedSlot === slot.startAt;
                return (
                  <button
                    key={slot.startAt}
                    type="button"
                    onClick={() => setSelectedSlot(slot.startAt)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left hover:bg-surface/60"
                  >
                    <span className="text-sm font-medium text-foreground">
                      {slot.label}
                    </span>
                    <span
                      aria-hidden
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
                        checked
                          ? "border-foreground bg-foreground"
                          : "border-border-strong",
                      )}
                    >
                      {checked ? (
                        <span className="h-1.5 w-1.5 rounded-full bg-background" />
                      ) : null}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="space-y-2 border-t border-border px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Button
            type="button"
            className="w-full"
            disabled={!selectedSlot}
            onClick={() => {
              if (selectedSlot) {
                onConfirm(selectedSlot);
              }
            }}
          >
            Schedule
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={onClose}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
