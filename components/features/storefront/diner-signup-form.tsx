"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { TurnstileField } from "@/components/features/storefront/turnstile-field";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";

type DinerSignupFormProps = {
  turnstileSiteKey: string | null;
};

export function DinerSignupForm({ turnstileSiteKey }: DinerSignupFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    // Read from the DOM so Safari autofill is included (controlled React
    // state often stays empty when the browser fills password fields).
    const formData = new FormData(event.currentTarget);
    const nameValue = String(formData.get("name") ?? "").trim();
    const emailValue = String(formData.get("email") ?? "").trim();
    const phoneValue = String(formData.get("phone") ?? "").trim();
    const passwordValue = String(formData.get("password") ?? "");

    if (!nameValue || !emailValue || !phoneValue || !passwordValue) {
      setError("Fill in all fields to continue.");
      return;
    }

    if (turnstileSiteKey && !turnstileToken) {
      setError("Complete the security check and try again.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/diner/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: nameValue,
          email: emailValue,
          phone: phoneValue,
          password: passwordValue,
          turnstileToken: turnstileToken ?? undefined,
        }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok) {
        setError(body.error ?? "Could not create your account.");
        setTurnstileToken(null);
        setTurnstileResetKey((key) => key + 1);
        setIsLoading(false);
        return;
      }

      const result = await signIn("credentials", {
        email: emailValue,
        password: passwordValue,
        redirect: false,
      });
      if (result?.error) {
        setIsLoading(false);
        router.push("/signin");
        router.refresh();
        return;
      }

      router.push("/account");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <FormField id="name" label="Name">
        <Input
          name="name"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          required
        />
      </FormField>
      <FormField id="email" label="Email">
        <Input
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
        />
      </FormField>
      <FormField id="phone" label="Phone">
        <Input
          name="phone"
          type="tel"
          autoComplete="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="5195550123"
          required
        />
      </FormField>
      <FormField id="password" label="Password">
        <Input
          name="password"
          type="password"
          autoComplete="new-password"
          defaultValue=""
          placeholder="At least 8 characters"
          required
          minLength={8}
        />
      </FormField>

      {turnstileSiteKey ? (
        <TurnstileField
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
        disabled={isLoading || (Boolean(turnstileSiteKey) && !turnstileToken)}
      >
        {isLoading ? "Creating account…" : "Create account"}
      </Button>

      <p className="text-center text-sm text-text-secondary">
        Already have an account?{" "}
        <Link
          href="/signin"
          className="font-medium text-foreground no-underline hover:underline"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
