"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { FormBanner } from "@/components/ui/form-banner";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { readApiError } from "@/lib/forms/read-api-error";

type StaffAccountFormProps = {
  initial: {
    name: string;
    email: string;
    phoneE164: string | null;
    role: string;
  };
};

function humanizeRole(role: string): string {
  if (role === "STORE_MANAGER") return "Store manager";
  return role
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function StaffAccountForm({ initial }: StaffAccountFormProps) {
  const { success, error: toastError } = useToast();
  const [name, setName] = useState(initial.name);
  const [email, setEmail] = useState(initial.email);
  const [phone, setPhone] = useState(initial.phoneE164 ?? "");
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profilePending, setProfilePending] = useState(false);
  const [emailPendingCode, setEmailPendingCode] = useState(false);
  const [emailCode, setEmailCode] = useState("");
  const [confirmingEmail, setConfirmingEmail] = useState(false);

  const [passwordStep, setPasswordStep] = useState<"idle" | "code" | "done">(
    "idle",
  );
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordPending, setPasswordPending] = useState(false);

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    setProfilePending(true);
    setProfileError(null);
    try {
      const response = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim() || undefined,
          email: email.trim().toLowerCase(),
        }),
      });
      if (!response.ok) {
        const message = await readApiError(response, "Unable to save profile.");
        setProfileError(message);
        toastError(message);
        return;
      }
      const body = (await response.json()) as {
        data: { emailChangePending: boolean };
      };
      if (body.data.emailChangePending) {
        setEmailPendingCode(true);
        success("Check your new email for a confirmation code.");
      } else {
        setEmailPendingCode(false);
        success("Profile saved");
      }
    } catch {
      const message = "Unable to save profile.";
      setProfileError(message);
      toastError(message);
    } finally {
      setProfilePending(false);
    }
  }

  async function confirmEmail(event: React.FormEvent) {
    event.preventDefault();
    setConfirmingEmail(true);
    setProfileError(null);
    try {
      const response = await fetch("/api/account/email/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: emailCode.trim() }),
      });
      if (!response.ok) {
        const message = await readApiError(response, "Unable to confirm email.");
        setProfileError(message);
        toastError(message);
        return;
      }
      setEmailPendingCode(false);
      setEmailCode("");
      success("Email updated");
    } catch {
      const message = "Unable to confirm email.";
      setProfileError(message);
      toastError(message);
    } finally {
      setConfirmingEmail(false);
    }
  }

  async function sendPasswordOtp() {
    setPasswordPending(true);
    setPasswordError(null);
    try {
      const response = await fetch("/api/account/password/otp", {
        method: "POST",
      });
      if (!response.ok) {
        const message = await readApiError(response, "Unable to send code.");
        setPasswordError(message);
        toastError(message);
        return;
      }
      setPasswordStep("code");
      success("Code sent to your email");
    } catch {
      const message = "Unable to send code.";
      setPasswordError(message);
      toastError(message);
    } finally {
      setPasswordPending(false);
    }
  }

  async function confirmPasswordChange(event: React.FormEvent) {
    event.preventDefault();
    setPasswordPending(true);
    setPasswordError(null);
    try {
      const response = await fetch("/api/account/password/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: otpCode.trim(),
          newPassword,
          confirmPassword,
        }),
      });
      if (!response.ok) {
        const message = await readApiError(
          response,
          "Unable to change password.",
        );
        setPasswordError(message);
        toastError(message);
        return;
      }
      setPasswordStep("done");
      setOtpCode("");
      setNewPassword("");
      setConfirmPassword("");
      success("Password updated — sign in again on other devices.");
    } catch {
      const message = "Unable to change password.";
      setPasswordError(message);
      toastError(message);
    } finally {
      setPasswordPending(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold text-foreground">Profile</h2>
          <p className="text-sm text-text-secondary">
            Role · {humanizeRole(initial.role)}
          </p>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={(e) => void saveProfile(e)} noValidate>
            {profileError ? <FormBanner>{profileError}</FormBanner> : null}
            <FormField id="staff-name" label="Name">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
            </FormField>
            <FormField id="staff-email" label="Email">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </FormField>
            <FormField id="staff-phone" label="Phone">
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
              />
            </FormField>
            <Button type="submit" disabled={profilePending}>
              {profilePending ? "Saving…" : "Save profile"}
            </Button>
          </form>

          {emailPendingCode ? (
            <form
              className="mt-6 space-y-4 border-t border-border pt-6"
              onSubmit={(e) => void confirmEmail(e)}
              noValidate
            >
              <p className="text-sm text-text-secondary">
                Enter the 6-digit code sent to your new email.
              </p>
              <FormField id="email-code" label="Code">
                <Input
                  inputMode="numeric"
                  maxLength={6}
                  value={emailCode}
                  onChange={(e) => setEmailCode(e.target.value)}
                />
              </FormField>
              <Button type="submit" disabled={confirmingEmail || emailCode.length !== 6}>
                {confirmingEmail ? "Confirming…" : "Confirm email"}
              </Button>
            </form>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold text-foreground">Security</h2>
          <p className="text-sm text-text-secondary">
            Change password with an email code. Passkeys coming soon.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {passwordError ? <FormBanner>{passwordError}</FormBanner> : null}

          {passwordStep === "idle" ? (
            <Button
              type="button"
              variant="secondary"
              disabled={passwordPending}
              onClick={() => void sendPasswordOtp()}
            >
              {passwordPending ? "Sending…" : "Send password code"}
            </Button>
          ) : null}

          {passwordStep === "code" ? (
            <form
              className="space-y-4"
              onSubmit={(e) => void confirmPasswordChange(e)}
              noValidate
            >
              <FormField id="pw-code" label="Code">
                <Input
                  inputMode="numeric"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                />
              </FormField>
              <FormField id="pw-new" label="New password">
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </FormField>
              <FormField id="pw-confirm" label="Confirm password">
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </FormField>
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={passwordPending}>
                  {passwordPending ? "Updating…" : "Update password"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={passwordPending}
                  onClick={() => void sendPasswordOtp()}
                >
                  Resend code
                </Button>
              </div>
            </form>
          ) : null}

          {passwordStep === "done" ? (
            <p className="text-sm text-text-secondary">
              Password updated. Other sessions were signed out.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
