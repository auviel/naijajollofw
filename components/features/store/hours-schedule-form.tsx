"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/toast";
import {
  dayOfWeekLabel,
  type StoreHoursDay,
  type StoreHoursSchedule,
} from "@/lib/domain/store/hours";
import { cn } from "@/lib/utils/cn";

async function readApiError(response: Response): Promise<string> {
  const body = (await response.json().catch(() => ({}))) as { error?: string };
  return body.error ?? "Unable to save.";
}

type HoursScheduleFormProps = {
  initial: StoreHoursSchedule;
};

export function HoursScheduleForm({ initial }: HoursScheduleFormProps) {
  const { success, error: toastError } = useToast();
  const [days, setDays] = useState<StoreHoursDay[]>(initial.days);
  const [pending, setPending] = useState(false);

  function updateDay(dayOfWeek: number, patch: Partial<StoreHoursDay>) {
    setDays((prev) =>
      prev.map((day) =>
        day.dayOfWeek === dayOfWeek ? { ...day, ...patch } : day,
      ),
    );
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    try {
      const response = await fetch("/api/store/hours", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days }),
      });
      if (!response.ok) {
        toastError(await readApiError(response));
        return;
      }
      const body = (await response.json()) as { data: StoreHoursSchedule };
      setDays(body.data.days);
      success("Hours schedule saved");
    } catch {
      toastError("Unable to save hours.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={(e) => void save(e)} className="max-w-2xl space-y-4">
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

      <div className="divide-y divide-border rounded-md border border-border">
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
                onChange={(e) =>
                  updateDay(day.dayOfWeek, { openTime: e.target.value })
                }
                className="h-10 rounded-md border border-border bg-surface-elevated px-2 text-sm"
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
                onChange={(e) =>
                  updateDay(day.dayOfWeek, { closeTime: e.target.value })
                }
                className="h-10 rounded-md border border-border bg-surface-elevated px-2 text-sm"
              />
            </div>
          </div>
        ))}
      </div>

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
