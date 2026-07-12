"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { signOut } from "next-auth/react";
import { EmailVerifyBanner } from "@/components/features/storefront/email-verify-banner";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

type AccountSecurityClientProps = {
  email: string;
  emailVerified: boolean;
};

export function AccountSecurityClient({
  email,
  emailVerified,
}: AccountSecurityClientProps) {
  const router = useRouter();
  const { success, error: toastError } = useToast();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [newEmail, setNewEmail] = useState(email);
  const [emailPassword, setEmailPassword] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailLoading, setEmailLoading] = useState(false);

  async function handlePasswordSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError(null);
    setPasswordLoading(true);

    try {
      const response = await fetch("/api/diner/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok) {
        setPasswordError(body.error ?? "Could not update password.");
        setPasswordLoading(false);
        return;
      }

      await signOut({ redirect: false });
      router.push("/signin");
      router.refresh();
    } catch {
      setPasswordError("Something went wrong. Please try again.");
      setPasswordLoading(false);
    }
  }

  async function handleEmailSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEmailError(null);
    setEmailLoading(true);

    try {
      const response = await fetch("/api/diner/change-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newEmail,
          password: emailPassword,
        }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
        data?: { email?: string; message?: string };
      };
      if (!response.ok) {
        setEmailError(body.error ?? "Could not update email.");
        setEmailLoading(false);
        return;
      }

      setEmailPassword("");
      success(body.data?.message ?? "Email updated. Check your inbox to verify.");
      // Session version bumped — re-auth required
      await signOut({ redirect: false });
      router.push("/signin");
      router.refresh();
    } catch {
      setEmailError("Something went wrong. Please try again.");
      toastError("Could not update email.");
      setEmailLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      {!emailVerified ? <EmailVerifyBanner email={email} /> : null}

      <div className="rounded-2xl border border-border bg-background p-5 sm:p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">
          Change email
        </h2>
        <form onSubmit={handleEmailSubmit} className="mt-4 space-y-4" noValidate>
          <FormField id="newEmail" label="Email">
            <Input
              name="newEmail"
              type="email"
              autoComplete="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              required
            />
          </FormField>
          <FormField id="emailPassword" label="Current password">
            <Input
              name="emailPassword"
              type="password"
              autoComplete="current-password"
              value={emailPassword}
              onChange={(e) => setEmailPassword(e.target.value)}
              required
            />
          </FormField>
          {emailError ? (
            <p className="text-sm text-error" role="alert">
              {emailError}
            </p>
          ) : null}
          <Button type="submit" variant="secondary" disabled={emailLoading}>
            {emailLoading ? "Updating…" : "Update email"}
          </Button>
        </form>
      </div>

      <div className="rounded-2xl border border-border bg-background p-5 sm:p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">
          Change password
        </h2>
        {!emailVerified ? (
          <p className="mt-3 text-sm text-text-secondary">
            Verify your email before changing your password.
          </p>
        ) : (
          <form
            onSubmit={handlePasswordSubmit}
            className="mt-4 space-y-4"
            noValidate
          >
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
                name="newPassword"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
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
            {passwordError ? (
              <p className="text-sm text-error" role="alert">
                {passwordError}
              </p>
            ) : null}
            <Button type="submit" variant="secondary" disabled={passwordLoading}>
              {passwordLoading ? "Updating…" : "Update password"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
