"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { TurnstileField } from "@/components/features/storefront/turnstile-field";
import { Button } from "@/components/ui/button";
import { FormBanner } from "@/components/ui/form-banner";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { PhoneField } from "@/components/ui/phone-field";
import { validateDinerRegisterForm } from "@/lib/domain/diner/form-validation";
import { readApiErrorResponse } from "@/lib/forms/read-api-error";

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
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<"name" | "email" | "phone" | "password", string>>
  >({});
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
    const passwordValue = String(formData.get("password") ?? "");
    const phoneValue = phone.replace(/\D/g, "").slice(0, 10);

    const validation = validateDinerRegisterForm({
      name: nameValue,
      email: emailValue,
      phone: phoneValue,
      password: passwordValue,
    });
    setFieldErrors(validation);
    if (Object.keys(validation).length > 0) {
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
      if (!response.ok) {
        const { message, fieldErrors: apiFields } =
          await readApiErrorResponse(response, "Could not create your account.");
        setFieldErrors((current) => ({ ...current, ...apiFields }));
        setError(message);
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
      <FormField id="name" label="Name" error={fieldErrors.name}>
        <Input
          name="name"
          autoComplete="name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (fieldErrors.name) {
              setFieldErrors((current) => ({ ...current, name: undefined }));
            }
          }}
          placeholder="Your name"
        />
      </FormField>
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
      <PhoneField
        id="phone"
        name="phone"
        value={phone}
        error={fieldErrors.phone}
        onChange={(next) => {
          setPhone(next);
          if (fieldErrors.phone) {
            setFieldErrors((current) => ({ ...current, phone: undefined }));
          }
        }}
      />
      <FormField id="password" label="Password" error={fieldErrors.password}>
        <PasswordInput
          name="password"
          autoComplete="new-password"
          defaultValue=""
          placeholder="At least 8 characters"
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

      {turnstileSiteKey ? (
        <TurnstileField
          siteKey={turnstileSiteKey}
          resetKey={turnstileResetKey}
          onToken={setTurnstileToken}
        />
      ) : null}

      {error ? <FormBanner>{error}</FormBanner> : null}

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
