"use client";

import { useState } from "react";
import { FormBanner } from "@/components/ui/form-banner";
import { useToast } from "@/components/ui/toast";
import { validateHoursSchedule } from "@/lib/domain/store/form-validation";
import {
  dayOfWeekLabel,
  type StoreHoursDay,
  type StoreHoursSchedule,
} from "@/lib/domain/store/hours";
import { readApiError } from "@/lib/forms/read-api-error";
import { cn } from "@/lib/utils/cn";

type HoursScheduleFormProps = {
  initial: StoreHoursSchedule;
};

export function HoursScheduleForm({ initial }: HoursScheduleFormProps) {
  const { success, error: toastError } = useToast();
  const [days, setDays] = useState<StoreHoursDay[]>(initial.days);
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [dayErrors, setDayErrors] = useState<Record<number, string>>({});

  function updateDay(dayOfWeek: number, patch: Partial<StoreHoursDay>) {
    setDays((prev) =>
      prev.map((day) =>
        day.dayOfWeek === dayOfWeek ? { ...day, ...patch } : day,
      ),
    );
    if (dayErrors[dayOfWeek]) {
      setDayErrors((current) => {
        const next = { ...current };
        delete next[dayOfWeek];
        return next;
      });
    }
    if (formError) {
      setFormError(null);
    }
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const validation = validateHoursSchedule(days);
    setDayErrors(validation.dayErrors);
    setFormError(validation.formError ?? null);
    if (validation.formError || Object.keys(validation.dayErrors).length > 0) {
      return;
    }

    setPending(true);
    try {
      const response = await fetch("/api/store/hours", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days }),
      });
      if (!response.ok) {
        const message = await readApiError(response, "Unable to save.");
        setFormError(message);
        toastError(message);
        return;
      }
      const body = (await response.json()) as { data: StoreHoursSchedule };
      setDays(body.data.days);
      setDayErrors({});
      setFormError(null);
      success("Hours schedule saved");
    } catch {
      const message = "Unable to save hours.";
      setFormError(message);
      toastError(message);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={(e) => void save(e)} className="max-w-2xl space-y-4" noValidate>
      <div className="space-y-1">
        <h2 className="text-base font-semibold text-foreground">Weekly hours</h2>
        <p className="text-sm text-text-secondary">
          Times use your store timezone ({initial.timezone}). Guests cannot
          checkout while closed. Overnight closes are supported (e.g. 22:00–02:00).
        </p>
        {!initial.configured ? (
          <p className="text-sm text-text-secondary">
            No schedule saved yet — the storefront is treated as always open until
            you save one.
          </p>
        ) : null}
      </div>

      <div className="divide-y divide-border rounded-2xl bg-surface-elevated">
        {days.map((day) => (
          <div
            key={day.dayOfWeek}
            className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex min-w-[8rem] items-center gap-3">
              <span className="text-sm font-medium text-foreground">
                {dayOfWeekLabel(day.dayOfWeek)}
              </span>
              <label className="flex items-center gap-2 text-sm text-text-secondary">
                <input
                  type="checkbox"
                  checked={day.closed}
                  onChange={(e) => {
                    const closed = e.target.checked;
                    updateDay(day.dayOfWeek, {
                      closed,
                      openTime: closed ? null : (day.openTime ?? "11:00"),
                      closeTime: closed ? null : (day.closeTime ?? "22:00"),
                    });
                  }}
                  className="rounded-md border-border"
                />
                Closed
              </label>
            </div>

            <div className="space-y-1">
              <div
                className={cn(
                  "flex flex-wrap items-center gap-2",
                  day.closed && "pointer-events-none opacity-40",
                )}
              >
                <label className="sr-only" htmlFor={`open-${day.dayOfWeek}`}>
                  Open time
                </label>
                <input
                  id={`open-${day.dayOfWeek}`}
                  type="time"
                  value={day.openTime ?? "11:00"}
                  disabled={day.closed}
                  aria-invalid={dayErrors[day.dayOfWeek] ? true : undefined}
                  onChange={(e) =>
                    updateDay(day.dayOfWeek, { openTime: e.target.value })
                  }
                  className={cn(
                    "h-10 rounded-md border bg-surface-elevated px-2 text-sm",
                    dayErrors[day.dayOfWeek]
                      ? "border-error"
                      : "border-border",
                  )}
                />
                <span className="text-sm text-text-tertiary">to</span>
                <label className="sr-only" htmlFor={`close-${day.dayOfWeek}`}>
                  Close time
                </label>
                <input
                  id={`close-${day.dayOfWeek}`}
                  type="time"
                  value={day.closeTime ?? "22:00"}
                  disabled={day.closed}
                  aria-invalid={dayErrors[day.dayOfWeek] ? true : undefined}
                  onChange={(e) =>
                    updateDay(day.dayOfWeek, { closeTime: e.target.value })
                  }
                  className={cn(
                    "h-10 rounded-md border bg-surface-elevated px-2 text-sm",
                    dayErrors[day.dayOfWeek]
                      ? "border-error"
                      : "border-border",
                  )}
                />
              </div>
              {dayErrors[day.dayOfWeek] ? (
                <p role="alert" className="text-sm text-error">
                  {dayErrors[day.dayOfWeek]}
                </p>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      {formError ? <FormBanner>{formError}</FormBanner> : null}

      <button
        type="submit"
        disabled={pending}
        className="h-11 rounded-md bg-accent px-4 text-sm font-medium text-text-inverse disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save hours"}
      </button>
    </form>
  );
}
