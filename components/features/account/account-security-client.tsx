"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { signOut } from "next-auth/react";
import { EmailVerifyBanner } from "@/components/features/storefront/email-verify-banner";
import { Button } from "@/components/ui/button";
import { FormBanner } from "@/components/ui/form-banner";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { useToast } from "@/components/ui/toast";
import {
  validateDinerChangeEmailForm,
  validateDinerChangePasswordForm,
} from "@/lib/domain/diner/form-validation";
import {
  flattenApiFieldErrors,
  readApiErrorResponse,
} from "@/lib/forms/read-api-error";

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
  const [passwordFieldErrors, setPasswordFieldErrors] = useState<
    Partial<Record<"currentPassword" | "newPassword" | "confirmPassword", string>>
  >({});
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [newEmail, setNewEmail] = useState(email);
  const [emailPassword, setEmailPassword] = useState("");
  const [emailFieldErrors, setEmailFieldErrors] = useState<
    Partial<Record<"email" | "password", string>>
  >({});
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailLoading, setEmailLoading] = useState(false);

  async function handlePasswordSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError(null);

    const validation = validateDinerChangePasswordForm({
      currentPassword,
      newPassword,
      confirmPassword,
    });
    setPasswordFieldErrors(validation);
    if (Object.keys(validation).length > 0) {
      return;
    }

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
      if (!response.ok) {
        const { message, fieldErrors } = await readApiErrorResponse(
          response,
          "Could not update password.",
        );
        setPasswordFieldErrors((current) => ({ ...current, ...fieldErrors }));
        setPasswordError(message);
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

    const validation = validateDinerChangeEmailForm({
      email: newEmail,
      password: emailPassword,
    });
    setEmailFieldErrors(validation);
    if (Object.keys(validation).length > 0) {
      return;
    }

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
        details?: Parameters<typeof flattenApiFieldErrors>[0];
        data?: { email?: string; message?: string };
      };
      if (!response.ok) {
        const fieldErrors = flattenApiFieldErrors(body.details);
        const firstField = Object.values(fieldErrors)[0];
        const message =
          body.error === "Validation failed" && firstField
            ? firstField
            : body.error?.trim() || firstField || "Could not update email.";
        setEmailFieldErrors((current) => ({ ...current, ...fieldErrors }));
        setEmailError(message);
        setEmailLoading(false);
        return;
      }

      setEmailPassword("");
      success(body.data?.message ?? "Email updated. Check your inbox to verify.");
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
          <FormField id="newEmail" label="Email" error={emailFieldErrors.email}>
            <Input
              name="newEmail"
              type="email"
              autoComplete="email"
              value={newEmail}
              onChange={(e) => {
                setNewEmail(e.target.value);
                if (emailFieldErrors.email) {
                  setEmailFieldErrors((current) => ({
                    ...current,
                    email: undefined,
                  }));
                }
              }}
            />
          </FormField>
          <FormField
            id="emailPassword"
            label="Current password"
            error={emailFieldErrors.password}
          >
            <PasswordInput
              name="emailPassword"
              autoComplete="current-password"
              value={emailPassword}
              onChange={(e) => {
                setEmailPassword(e.target.value);
                if (emailFieldErrors.password) {
                  setEmailFieldErrors((current) => ({
                    ...current,
                    password: undefined,
                  }));
                }
              }}
            />
          </FormField>
          {emailError ? <FormBanner>{emailError}</FormBanner> : null}
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
            <FormField
              id="currentPassword"
              label="Current password"
              error={passwordFieldErrors.currentPassword}
            >
              <PasswordInput
                name="currentPassword"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value);
                  if (passwordFieldErrors.currentPassword) {
                    setPasswordFieldErrors((current) => ({
                      ...current,
                      currentPassword: undefined,
                    }));
                  }
                }}
              />
            </FormField>
            <FormField
              id="newPassword"
              label="New password"
              error={passwordFieldErrors.newPassword}
            >
              <PasswordInput
                name="newPassword"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (passwordFieldErrors.newPassword) {
                    setPasswordFieldErrors((current) => ({
                      ...current,
                      newPassword: undefined,
                    }));
                  }
                }}
              />
            </FormField>
            <FormField
              id="confirmPassword"
              label="Confirm new password"
              error={passwordFieldErrors.confirmPassword}
            >
              <PasswordInput
                name="confirmPassword"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (passwordFieldErrors.confirmPassword) {
                    setPasswordFieldErrors((current) => ({
                      ...current,
                      confirmPassword: undefined,
                    }));
                  }
                }}
              />
            </FormField>
            {passwordError ? <FormBanner>{passwordError}</FormBanner> : null}
            <Button type="submit" variant="secondary" disabled={passwordLoading}>
              {passwordLoading ? "Updating…" : "Update password"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
