"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";

type DinerChangePasswordFormProps = {
  emailVerified: boolean;
};

export function DinerChangePasswordForm({
  emailVerified,
}: DinerChangePasswordFormProps) {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!emailVerified) {
    return (
      <p className="text-sm text-text-secondary">
        Verify your email above before you can change your password.
      </p>
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/diner/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          password,
          confirmPassword,
        }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
        data?: { message?: string };
      };
      if (!response.ok) {
        setError(body.error ?? "Could not update password.");
        setIsLoading(false);
        return;
      }

      setMessage(body.data?.message ?? "Password updated.");
      setCurrentPassword("");
      setPassword("");
      setConfirmPassword("");
      setIsLoading(false);
      await signOut({ redirect: false });
      router.push("/signin");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <FormField id="currentPassword" label="Current password">
        <Input
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
        />
      </FormField>
      <FormField id="newPassword" label="New password">
        <Input
          name="password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
        />
      </FormField>
      <FormField id="confirmPassword" label="Confirm new password">
        <Input
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength={8}
        />
      </FormField>

      {error ? (
        <p className="text-sm text-error" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="text-sm text-text-secondary">{message}</p>
      ) : null}

      <Button type="submit" variant="secondary" disabled={isLoading}>
        {isLoading ? "Updating…" : "Update password"}
      </Button>
    </form>
  );
}
