"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FormBanner } from "@/components/ui/form-banner";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { validateDinerForgotPasswordForm } from "@/lib/domain/diner/form-validation";
import { readApiErrorResponse } from "@/lib/forms/read-api-error";

export function DinerForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<"email", string>>>(
    {},
  );
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const validation = validateDinerForgotPasswordForm({ email });
    setFieldErrors(validation);
    if (Object.keys(validation).length > 0) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/diner/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!response.ok) {
        const { message, fieldErrors: apiFields } = await readApiErrorResponse(
          response,
          "Could not send reset email.",
        );
        setFieldErrors((current) => ({ ...current, ...apiFields }));
        setError(message);
        setIsLoading(false);
        return;
      }
      setDone(true);
      setIsLoading(false);
    } catch {
      setError("Something went wrong. Please try again.");
      setIsLoading(false);
    }
  }

  if (done) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-text-secondary">
          If an account exists for that email, we sent a reset link. Check your
          inbox and spam folder.
        </p>
        <p className="text-center text-sm text-text-secondary">
          <Link
            href="/signin"
            className="font-medium text-foreground no-underline hover:underline"
          >
            Back to sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <FormField id="email" label="Email" error={fieldErrors.email}>
        <Input
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (fieldErrors.email) {
              setFieldErrors((current) => ({ ...current, email: undefined }));
            }
          }}
          placeholder="you@example.com"
        />
      </FormField>

      {error ? <FormBanner>{error}</FormBanner> : null}

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "Sending…" : "Send reset link"}
      </Button>

      <p className="text-center text-sm text-text-secondary">
        <Link
          href="/signin"
          className="font-medium text-foreground no-underline hover:underline"
        >
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
