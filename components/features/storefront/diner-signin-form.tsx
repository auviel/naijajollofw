"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { TurnstileField } from "@/components/features/storefront/turnstile-field";
import { Button } from "@/components/ui/button";
import { FormBanner } from "@/components/ui/form-banner";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { validateDinerSigninFields } from "@/lib/domain/diner/form-validation";
import { safeCallbackUrl } from "@/lib/utils/safe-callback-url";

type ChallengeResponse = {
  data?: {
    requiresTurnstile?: boolean;
    ipBlocked?: boolean;
    turnstileSiteKey?: string | null;
  };
};

export function DinerSigninForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = safeCallbackUrl(
    searchParams.get("callbackUrl"),
    "/account",
  );

  const [email, setEmail] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);
  const [requiresTurnstile, setRequiresTurnstile] = useState(false);
  const [ipBlocked, setIpBlocked] = useState(false);
  const [turnstileSiteKey, setTurnstileSiteKey] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<"email" | "password", string>>
  >({});
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const refreshChallenge = useCallback(async (nextEmail: string) => {
    const trimmed = nextEmail.trim();
    if (!trimmed.includes("@")) {
      setRequiresTurnstile(false);
      setIpBlocked(false);
      return;
    }
    try {
      const response = await fetch("/api/auth/login-challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      const body = (await response.json().catch(() => ({}))) as ChallengeResponse;
      if (!response.ok) {
        return;
      }
      setRequiresTurnstile(Boolean(body.data?.requiresTurnstile));
      setIpBlocked(Boolean(body.data?.ipBlocked));
      setTurnstileSiteKey(body.data?.turnstileSiteKey ?? null);
      if (!body.data?.requiresTurnstile) {
        setTurnstileToken(null);
      }
    } catch {
      // Keep last known challenge state.
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void refreshChallenge(email);
    }, 400);
    return () => window.clearTimeout(timeout);
  }, [email, refreshChallenge]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    // Read from the DOM so Safari/Chrome autofill is included (controlled
    // React state often stays empty when the browser fills the fields).
    const formData = new FormData(event.currentTarget);
    const emailValue = String(formData.get("email") ?? "").trim();
    const passwordValue = String(formData.get("password") ?? "");

    const validation = validateDinerSigninFields({
      email: emailValue,
      password: passwordValue,
    });
    setFieldErrors(validation);
    if (Object.keys(validation).length > 0) {
      return;
    }

    if (ipBlocked) {
      setError("Too many sign-in attempts. Try again in about 15 minutes.");
      return;
    }

    if (requiresTurnstile && turnstileSiteKey && !turnstileToken) {
      setError("Complete the security check and try again.");
      return;
    }

    setIsLoading(true);

    const result = await signIn("credentials", {
      email: emailValue,
      password: passwordValue,
      turnstileToken: turnstileToken ?? "",
      redirect: false,
    });

    setIsLoading(false);

    if (result?.error) {
      setError("Invalid email or password.");
      setTurnstileToken(null);
      setTurnstileResetKey((key) => key + 1);
      await refreshChallenge(emailValue);
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  }

  const showTurnstile = requiresTurnstile && Boolean(turnstileSiteKey);

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
      <FormField id="password" label="Password" error={fieldErrors.password}>
        <PasswordInput
          name="password"
          autoComplete="current-password"
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
      <p className="-mt-2 text-right text-sm">
        <Link
          href="/forgot-password"
          className="text-text-secondary no-underline hover:text-foreground hover:underline"
        >
          Forgot password?
        </Link>
      </p>

      {showTurnstile && turnstileSiteKey ? (
        <TurnstileField
          key={`signin-turnstile-${email}`}
          siteKey={turnstileSiteKey}
          resetKey={turnstileResetKey}
          onToken={setTurnstileToken}
        />
      ) : null}

      {error ? <FormBanner>{error}</FormBanner> : null}

      <Button
        type="submit"
        className="w-full"
        disabled={isLoading || (showTurnstile && !turnstileToken)}
      >
        {isLoading ? "Signing in…" : "Sign in"}
      </Button>

      <p className="text-center text-sm text-text-secondary">
        New here?{" "}
        <Link
          href="/signup"
          className="font-medium text-foreground no-underline hover:underline"
        >
          Create an account
        </Link>
      </p>
      <p className="text-center text-sm text-text-tertiary">
        Prefer not to?{" "}
        <Link href="/checkout" className="text-text-secondary hover:underline">
          Continue as guest
        </Link>
      </p>
    </form>
  );
}
