"use client";

import { TurnstileField } from "@/components/features/storefront/turnstile-field";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { validateLoginFields } from "@/lib/domain/delivery/form-validation";
import { safeCallbackUrl } from "@/lib/utils/safe-callback-url";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type ChallengeResponse = {
  data?: {
    requiresTurnstile?: boolean;
    ipBlocked?: boolean;
    turnstileSiteKey?: string | null;
  };
};

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = safeCallbackUrl(
    searchParams.get("callbackUrl"),
    "/dashboard",
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

    const formData = new FormData(event.currentTarget);
    const emailValue = String(formData.get("email") ?? "").trim();
    const passwordValue = String(formData.get("password") ?? "");

    const validation = validateLoginFields({
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
      setError(
        "Invalid email or password. Check your credentials and try again.",
      );
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
          onChange={(event) => {
            setEmail(event.target.value);
            if (fieldErrors.email) {
              setFieldErrors((current) => ({ ...current, email: undefined }));
            }
          }}
          placeholder="store.manager@delivergo.local"
        />
      </FormField>

      <FormField id="password" label="Password" error={fieldErrors.password}>
        <Input
          name="password"
          type="password"
          autoComplete="current-password"
          defaultValue=""
        />
      </FormField>

      {showTurnstile && turnstileSiteKey ? (
        <TurnstileField
          key={`login-turnstile-${email}`}
          siteKey={turnstileSiteKey}
          resetKey={turnstileResetKey}
          onToken={setTurnstileToken}
        />
      ) : null}

      {error ? (
        <p className="text-sm text-error" role="alert">
          {error}
        </p>
      ) : null}

      <Button
        type="submit"
        className="w-full"
        disabled={isLoading || (showTurnstile && !turnstileToken)}
      >
        {isLoading ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
