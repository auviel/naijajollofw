import { Resend } from "resend";

let client: Resend | null = null;

export function isResendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

export function getResendClient(): Resend | null {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) {
    return null;
  }
  if (!client) {
    client = new Resend(key);
  }
  return client;
}

export function getEmailFrom(): string {
  return (
    process.env.EMAIL_FROM?.trim() ||
    "Naija Jollof Waterloo <hello@naijajollofw.ca>"
  );
}

export function getEmailReplyTo(): string | undefined {
  const value = process.env.EMAIL_REPLY_TO?.trim();
  return value || undefined;
}

export function getAppBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}
