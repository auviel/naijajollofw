"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type EmailVerifyBannerProps = {
  email: string;
};

export function EmailVerifyBanner({ email }: EmailVerifyBannerProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleResend() {
    setError(null);
    setMessage(null);
    setIsLoading(true);
    try {
      const response = await fetch("/api/diner/verify-email/resend", {
        method: "POST",
      });
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
        data?: { message?: string };
      };
      if (!response.ok) {
        setError(body.error ?? "Could not send verification email.");
        return;
      }
      setMessage(body.data?.message ?? "Verification email sent.");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div
      className="mt-8 rounded-2xl border border-accent/25 bg-accent/5 px-4 py-4 sm:px-5"
      role="status"
    >
      <p className="text-sm font-medium text-foreground">Verify your email</p>
      <p className="mt-1 text-sm text-text-secondary">
        We sent a link to <span className="font-medium text-foreground">{email}</span>.
        Confirm it so we know this account is yours.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="secondary"
          className="h-9 px-3 text-sm"
          disabled={isLoading}
          onClick={() => void handleResend()}
        >
          {isLoading ? "Sending…" : "Resend verification email"}
        </Button>
        {message ? (
          <p className="text-sm text-text-secondary">{message}</p>
        ) : null}
        {error ? (
          <p className="text-sm text-error" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
