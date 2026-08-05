"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FormBanner } from "@/components/ui/form-banner";
import { FormField } from "@/components/ui/form-field";
import { PasswordInput } from "@/components/ui/password-input";
import { validateDinerResetPasswordForm } from "@/lib/domain/diner/form-validation";
import { readApiErrorResponse } from "@/lib/forms/read-api-error";

export function DinerResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<"password" | "confirmPassword", string>>
  >({});
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!token) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-error" role="alert">
          This reset link is missing or incomplete. Request a new one.
        </p>
        <p className="text-center text-sm text-text-secondary">
          <Link
            href="/forgot-password"
            className="font-medium text-foreground no-underline hover:underline"
          >
            Request a new link
          </Link>
        </p>
      </div>
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirm") ?? "");

    const validation = validateDinerResetPasswordForm({
      token,
      password,
      confirmPassword,
    });
    setFieldErrors(validation);
    if (Object.keys(validation).length > 0) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/diner/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          password,
          confirmPassword,
        }),
      });
      if (!response.ok) {
        const { message, fieldErrors: apiFields } = await readApiErrorResponse(
          response,
          "Could not reset password.",
        );
        setFieldErrors((current) => ({ ...current, ...apiFields }));
        setError(message);
        setIsLoading(false);
        return;
      }
      router.push("/signin");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <FormField id="password" label="New password" error={fieldErrors.password}>
        <PasswordInput
          name="password"
          autoComplete="new-password"
          defaultValue=""
          onChange={() => {
            if (fieldErrors.password) {
              setFieldErrors((current) => ({
                ...current,
                password: undefined,
              }));
            }
          }}
        />
      </FormField>
      <FormField
        id="confirm"
        label="Confirm password"
        error={fieldErrors.confirmPassword}
      >
        <PasswordInput
          name="confirm"
          autoComplete="new-password"
          defaultValue=""
          onChange={() => {
            if (fieldErrors.confirmPassword) {
              setFieldErrors((current) => ({
                ...current,
                confirmPassword: undefined,
              }));
            }
          }}
        />
      </FormField>

      {error ? <FormBanner>{error}</FormBanner> : null}

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "Updating…" : "Set new password"}
      </Button>
    </form>
  );
}
