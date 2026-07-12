import { getAppBaseUrl } from "@/lib/integrations/email/resend-client";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** PNG lockup — WebP is unreliable in many mail clients. */
function emailLogoUrl(): string {
  return `${getAppBaseUrl()}/brand/naija-jollof-logo.png`;
}

function layout(title: string, bodyHtml: string): string {
  const logoSrc = escapeHtml(emailLogoUrl());
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:0;background:#f6f6f6;font-family:ui-sans-serif,system-ui,-apple-system,sans-serif;color:#111;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f6f6;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;">
          <tr>
            <td align="center" style="background:#000000;padding:22px 24px;">
              <img
                src="${logoSrc}"
                alt="Naija Jollof Waterloo"
                width="220"
                height="59"
                style="display:block;border:0;outline:none;text-decoration:none;width:220px;max-width:100%;height:auto;"
              />
            </td>
          </tr>
          <tr>
            <td style="padding:28px 24px 32px;">${bodyHtml}</td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildWelcomeEmail(input: {
  name: string;
  accountUrl: string;
}): { subject: string; html: string; text: string } {
  const first = input.name.trim().split(/\s+/)[0] || "there";
  const subject = "Welcome to Naija Jollof Waterloo";
  const html = layout(
    subject,
    `<p style="margin:0 0 12px;font-size:16px;line-height:1.5;">Hi ${escapeHtml(first)},</p>
     <p style="margin:0 0 12px;font-size:15px;line-height:1.55;color:#444;">Your account is ready. Order pickup or delivery anytime, and track your orders from your account.</p>
     <p style="margin:24px 0;">
       <a href="${escapeHtml(input.accountUrl)}" style="display:inline-block;background:#CC5400;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;font-size:14px;font-weight:600;">View account</a>
     </p>
     <p style="margin:0;font-size:13px;color:#757575;">You can also order as a guest anytime.</p>`,
  );
  const text = `Hi ${first},\n\nYour Naija Jollof Waterloo account is ready.\nView account: ${input.accountUrl}\n\nYou can also order as a guest anytime.`;
  return { subject, html, text };
}

export function buildOrderConfirmationEmail(input: {
  customerName: string;
  storeName: string;
  fulfillmentType: "pickup" | "delivery";
  totalLabel: string;
  trackUrl: string;
  scheduledLabel?: string | null;
}): { subject: string; html: string; text: string } {
  const first = input.customerName.trim().split(/\s+/)[0] || "there";
  const mode = input.fulfillmentType === "delivery" ? "delivery" : "pickup";
  const subject = `Order confirmed · ${input.storeName}`;
  const scheduleLine = input.scheduledLabel
    ? `<p style="margin:0 0 12px;font-size:15px;line-height:1.55;color:#444;">Scheduled for <strong>${escapeHtml(input.scheduledLabel)}</strong>.</p>`
    : "";
  const scheduleText = input.scheduledLabel
    ? `\nScheduled for ${input.scheduledLabel}.`
    : "";

  const html = layout(
    subject,
    `<p style="margin:0 0 12px;font-size:16px;line-height:1.5;">Hi ${escapeHtml(first)},</p>
     <p style="margin:0 0 12px;font-size:15px;line-height:1.55;color:#444;">We received your ${mode} order from <strong>${escapeHtml(input.storeName)}</strong>. Total ${escapeHtml(input.totalLabel)}.</p>
     ${scheduleLine}
     <p style="margin:24px 0;">
       <a href="${escapeHtml(input.trackUrl)}" style="display:inline-block;background:#CC5400;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;font-size:14px;font-weight:600;">Track order</a>
     </p>
     <p style="margin:0;font-size:13px;color:#757575;">Keep this email for your records.</p>`,
  );
  const text = `Hi ${first},\n\nWe received your ${mode} order from ${input.storeName}. Total ${input.totalLabel}.${scheduleText}\n\nTrack order: ${input.trackUrl}\n`;
  return { subject, html, text };
}

export function buildPasswordResetEmail(input: {
  name: string;
  resetUrl: string;
}): { subject: string; html: string; text: string } {
  const first = input.name.trim().split(/\s+/)[0] || "there";
  const subject = "Reset your password";
  const html = layout(
    subject,
    `<p style="margin:0 0 12px;font-size:16px;line-height:1.5;">Hi ${escapeHtml(first)},</p>
     <p style="margin:0 0 12px;font-size:15px;line-height:1.55;color:#444;">We received a request to reset your Naija Jollof Waterloo password. This link expires in 1 hour.</p>
     <p style="margin:24px 0;">
       <a href="${escapeHtml(input.resetUrl)}" style="display:inline-block;background:#CC5400;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;font-size:14px;font-weight:600;">Reset password</a>
     </p>
     <p style="margin:0;font-size:13px;color:#757575;">If you did not request this, you can ignore this email.</p>`,
  );
  const text = `Hi ${first},\n\nReset your password (expires in 1 hour):\n${input.resetUrl}\n\nIf you did not request this, ignore this email.`;
  return { subject, html, text };
}
