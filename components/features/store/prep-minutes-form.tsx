"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/toast";

async function readApiError(response: Response): Promise<string> {
  const body = (await response.json().catch(() => ({}))) as { error?: string };
  return body.error ?? "Unable to save.";
}

type PrepMinutesFormProps = {
  initialPrepMinutes: number;
  storeName: string;
};

export function PrepMinutesForm({
  initialPrepMinutes,
  storeName,
}: PrepMinutesFormProps) {
  const { success, error: toastError } = useToast();
  const [prepMinutes, setPrepMinutes] = useState(String(initialPrepMinutes));
  const [pending, setPending] = useState(false);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const value = Number.parseInt(prepMinutes, 10);
    if (!Number.isFinite(value)) {
      toastError("Enter a valid number of minutes.");
      return;
    }

    setPending(true);
    try {
      const response = await fetch("/api/store/prep", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prepMinutes: value }),
      });
      if (!response.ok) {
        toastError(await readApiError(response));
        return;
      }
      const body = (await response.json()) as { data: { prepMinutes: number } };
      setPrepMinutes(String(body.data.prepMinutes));
      success("Prep time updated");
    } catch {
      toastError("Unable to save prep time.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={(e) => void save(e)} className="max-w-md space-y-4">
      <p className="text-sm text-text-secondary">
        Guests see this estimate on order tracking for{" "}
        <span className="font-medium text-foreground">{storeName}</span>.
      </p>
      <label className="block space-y-1.5 text-sm">
        <span className="font-medium text-foreground">Typical prep time (minutes)</span>
        <input
          type="number"
          min={5}
          max={180}
          value={prepMinutes}
          onChange={(e) => setPrepMinutes(e.target.value)}
          className="h-11 w-full rounded-md border border-border bg-surface-elevated px-3"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="h-11 rounded-md bg-accent px-4 text-sm font-medium text-text-inverse disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
