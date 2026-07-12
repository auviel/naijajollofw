"use client";

import { Calendar, ChevronLeft, ChevronRight, Clock } from "@/components/ui/icons";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";
import {
  clampScheduledPickupValue,
  formatPickupDateLabel,
  formatPickupTimeLabel,
  getCalendarWeeks,
  getPickupTimeSlots,
  isSameDay,
  parseDatetimeLocalValue,
  startOfDay,
  toDatetimeLocalValue,
} from "@/lib/domain/delivery/schedule";
import {
  SCROLL_INTO_VIEW_MARGIN_CLASS,
  scrollIntoViewSmooth,
} from "@/lib/utils/scroll-into-view";

type PickupDatetimePickerProps = {
  id?: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  min: string;
  max: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
};

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function isDaySelectable(day: Date, min: Date, max: Date): boolean {
  const dayStart = startOfDay(day).getTime();
  return dayStart >= startOfDay(min).getTime() && dayStart <= startOfDay(max).getTime();
}

export function PickupDatetimePicker({
  id,
  name,
  value,
  onChange,
  min,
  max,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
}: PickupDatetimePickerProps) {
  const datePanelId = useId();
  const timePanelId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const datePanelRef = useRef<HTMLDivElement>(null);
  const timePanelRef = useRef<HTMLDivElement>(null);
  const wasOpenPanelRef = useRef<"date" | "time" | null>(null);

  const [openPanel, setOpenPanel] = useState<"date" | "time" | null>(null);
  const [viewMonth, setViewMonth] = useState(() => startOfDay(parseDatetimeLocalValue(value)));
  const [prevSelectedTime, setPrevSelectedTime] = useState(() =>
    parseDatetimeLocalValue(value).getTime(),
  );

  const selected = useMemo(() => parseDatetimeLocalValue(value), [value]);
  const minDate = useMemo(() => parseDatetimeLocalValue(min), [min]);
  const maxDate = useMemo(() => parseDatetimeLocalValue(max), [max]);
  const timeSlots = useMemo(
    () => getPickupTimeSlots(selected, minDate, maxDate),
    [selected, minDate, maxDate],
  );

  if (selected.getTime() !== prevSelectedTime) {
    setPrevSelectedTime(selected.getTime());
    setViewMonth(startOfDay(selected));
  }

  useEffect(() => {
    if (!openPanel) {
      wasOpenPanelRef.current = null;
      return;
    }

    if (openPanel === wasOpenPanelRef.current) {
      return;
    }

    wasOpenPanelRef.current = openPanel;

    const frame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const target =
          openPanel === "date" ? datePanelRef.current : timePanelRef.current;
        scrollIntoViewSmooth(target ?? containerRef.current);
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [openPanel]);

  useEffect(() => {
    if (!openPanel) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpenPanel(null);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenPanel(null);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [openPanel]);

  function updateValue(next: string) {
    onChange(clampScheduledPickupValue(next, min, max));
  }

  function selectDate(day: Date) {
    const next = new Date(day);
    next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
    updateValue(toDatetimeLocalValue(next));
    setOpenPanel("time");
  }

  function selectTime(slot: Date) {
    updateValue(toDatetimeLocalValue(slot));
    setOpenPanel(null);
  }

  const monthLabel = viewMonth.toLocaleDateString("en-CA", {
    month: "long",
    year: "numeric",
  });

  const minMonth = startOfDay(minDate);
  const maxMonth = startOfDay(maxDate);
  const canGoPrev =
    viewMonth.getFullYear() > minMonth.getFullYear() ||
    (viewMonth.getFullYear() === minMonth.getFullYear() &&
      viewMonth.getMonth() > minMonth.getMonth());
  const canGoNext =
    viewMonth.getFullYear() < maxMonth.getFullYear() ||
    (viewMonth.getFullYear() === maxMonth.getFullYear() &&
      viewMonth.getMonth() < maxMonth.getMonth());

  return (
    <div
      ref={containerRef}
      className={cn("grid gap-3 sm:grid-cols-2", SCROLL_INTO_VIEW_MARGIN_CLASS)}
    >
      <input type="hidden" name={name} value={value} readOnly />

      <div className="relative">
        <button
          id={id}
          type="button"
          aria-describedby={ariaDescribedBy}
          aria-expanded={openPanel === "date"}
          aria-controls={datePanelId}
          aria-haspopup="dialog"
          data-invalid={ariaInvalid ? "true" : undefined}
          onClick={() => setOpenPanel((current) => (current === "date" ? null : "date"))}
          className={cn(
            "flex h-12 w-full items-center gap-3 rounded-md border border-border-strong bg-background px-4 text-left text-base text-foreground transition-colors hover:bg-surface",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-foreground",
            openPanel === "date" && "border-foreground",
            ariaInvalid && "border-error/30",
          )}
        >
          <Calendar className="h-4 w-4 shrink-0 text-text-tertiary" aria-hidden />
          <span className="min-w-0 truncate">{formatPickupDateLabel(selected)}</span>
        </button>

        {openPanel === "date" ? (
          <div
            ref={datePanelRef}
            id={datePanelId}
            role="dialog"
            aria-label="Choose pickup date"
            className="absolute left-0 top-full z-30 mt-2 w-[min(100vw-2rem,18rem)] rounded-2xl border border-border bg-surface-elevated p-4 shadow-lg sm:w-72"
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <button
                type="button"
                disabled={!canGoPrev}
                onClick={() =>
                  setViewMonth(
                    (current) => new Date(current.getFullYear(), current.getMonth() - 1, 1),
                  )
                }
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-foreground transition-colors hover:bg-surface disabled:opacity-40"
                aria-label="Previous month"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden />
              </button>
              <p className="text-sm font-semibold text-foreground">{monthLabel}</p>
              <button
                type="button"
                disabled={!canGoNext}
                onClick={() =>
                  setViewMonth(
                    (current) => new Date(current.getFullYear(), current.getMonth() + 1, 1),
                  )
                }
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-foreground transition-colors hover:bg-surface disabled:opacity-40"
                aria-label="Next month"
              >
                <ChevronRight className="h-4 w-4" aria-hidden />
              </button>
            </div>

            <div className="mb-1 grid grid-cols-7 gap-1">
              {WEEKDAY_LABELS.map((label) => (
                <span
                  key={label}
                  className="py-1 text-center text-[11px] font-medium uppercase tracking-wide text-text-tertiary"
                >
                  {label}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {getCalendarWeeks(viewMonth).flat().map((day) => {
                const inMonth = day.getMonth() === viewMonth.getMonth();
                const selectable = isDaySelectable(day, minDate, maxDate);
                const isSelected = isSameDay(day, selected);

                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    disabled={!selectable}
                    onClick={() => selectDate(day)}
                    className={cn(
                      "inline-flex h-9 w-9 items-center justify-center rounded-md text-sm transition-colors",
                      !inMonth && "text-text-tertiary/60",
                      selectable && !isSelected && "hover:bg-surface",
                      isSelected && "bg-accent text-text-inverse",
                      !selectable && "cursor-not-allowed opacity-30",
                    )}
                  >
                    {day.getDate()}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>

      <div className="relative">
        <button
          type="button"
          aria-expanded={openPanel === "time"}
          aria-controls={timePanelId}
          aria-haspopup="listbox"
          onClick={() => setOpenPanel((current) => (current === "time" ? null : "time"))}
          className={cn(
            "flex h-12 w-full items-center gap-3 rounded-md border border-border-strong bg-background px-4 text-left text-base text-foreground transition-colors hover:bg-surface",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-foreground",
            openPanel === "time" && "border-foreground",
          )}
        >
          <Clock className="h-4 w-4 shrink-0 text-text-tertiary" aria-hidden />
          <span className="min-w-0 truncate">{formatPickupTimeLabel(selected)}</span>
        </button>

        {openPanel === "time" ? (
          <div
            ref={timePanelRef}
            id={timePanelId}
            role="listbox"
            aria-label="Choose pickup time"
            className="absolute left-0 top-full z-30 mt-2 max-h-60 w-full overflow-y-auto rounded-2xl border border-border bg-surface-elevated py-1 shadow-lg"
          >
            {timeSlots.length === 0 ? (
              <p className="px-4 py-3 text-sm text-text-secondary">
                No times available for this date.
              </p>
            ) : (
              timeSlots.map((slot) => {
                const isSelected = slot.getTime() === selected.getTime();

                return (
                  <button
                    key={slot.toISOString()}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => selectTime(slot)}
                    className={cn(
                      "flex w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-surface",
                      isSelected && "bg-accent-subtle font-medium text-foreground",
                    )}
                  >
                    {formatPickupTimeLabel(slot)}
                  </button>
                );
              })
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
