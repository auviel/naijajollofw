"use client";

import { useState } from "react";
import { FormBanner } from "@/components/ui/form-banner";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { validatePrepMinutesInput } from "@/lib/domain/store/form-validation";
import { readApiError } from "@/lib/forms/read-api-error";

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
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const error = validatePrepMinutesInput(prepMinutes);
    setFieldError(error);
    setFormError(null);
    if (error) {
      return;
    }

    const value = Number.parseInt(prepMinutes, 10);
    setPending(true);
    try {
      const response = await fetch("/api/store/prep", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prepMinutes: value }),
      });
      if (!response.ok) {
        const message = await readApiError(response, "Unable to save.");
        setFormError(message);
        toastError(message);
        return;
      }
      const body = (await response.json()) as { data: { prepMinutes: number } };
      setPrepMinutes(String(body.data.prepMinutes));
      setFieldError(null);
      setFormError(null);
      success("Prep time updated");
    } catch {
      const message = "Unable to save prep time.";
      setFormError(message);
      toastError(message);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={(e) => void save(e)} className="max-w-md space-y-4" noValidate>
      <p className="text-sm text-text-secondary">
        Guests see this estimate on order tracking for{" "}
        <span className="font-medium text-foreground">{storeName}</span>.
      </p>
      <FormField
        id="prepMinutes"
        label="Typical prep time (minutes)"
        error={fieldError}
      >
        <Input
          type="number"
          min={5}
          max={180}
          value={prepMinutes}
          onChange={(e) => {
            setPrepMinutes(e.target.value);
            if (fieldError) {
              setFieldError(null);
            }
          }}
        />
      </FormField>
      {formError ? <FormBanner>{formError}</FormBanner> : null}
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
