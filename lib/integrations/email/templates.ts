import { getAppBaseUrl } from "@/lib/integrations/email/resend-client";

const STORE_ADDRESS = "280 Lester St #102, Waterloo, ON N2L 0G2, Canada";
const CONTACT_EMAIL = "hello@naijajollofw.ca";

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

function absoluteUrl(path: string): string {
  return `${getAppBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

function footerLinksHtml(): string {
  const privacy = escapeHtml(absoluteUrl("/privacy-policy"));
  const terms = escapeHtml(absoluteUrl("/terms-and-conditions"));
  const contact = escapeHtml(`mailto:${CONTACT_EMAIL}`);
  const unsubscribe = escapeHtml(
    `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Unsubscribe from emails")}`,
  );
  const link =
    "color:#757575;text-decoration:underline;text-underline-offset:2px;";

  return `<a href="${privacy}" style="${link}">Privacy</a>
    <span style="color:#c4c4c4;padding:0 6px;">·</span>
    <a href="${terms}" style="${link}">Terms</a>
    <span style="color:#c4c4c4;padding:0 6px;">·</span>
    <a href="${contact}" style="${link}">Contact</a>
    <span style="color:#c4c4c4;padding:0 6px;">·</span>
    <a href="${unsubscribe}" style="${link}">Unsubscribe</a>`;
}

function footerText(reason: string): string {
  return `
---
${reason}
Naija Jollof Waterloo
${STORE_ADDRESS}
${CONTACT_EMAIL}

Privacy: ${absoluteUrl("/privacy-policy")}
Terms: ${absoluteUrl("/terms-and-conditions")}
Unsubscribe from promotional emails: mailto:${CONTACT_EMAIL}?subject=Unsubscribe%20from%20emails
`.trim();
}

function layout(input: {
  title: string;
  bodyHtml: string;
  /** Why this email was sent — shown in the footer. */
  reason: string;
}): string {
  const logoSrc = escapeHtml(emailLogoUrl());
  const reason = escapeHtml(input.reason);

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><title>${escapeHtml(input.title)}</title></head>
<body style="margin:0;padding:0;background:#f6f6f6;font-family:ui-sans-serif,system-ui,-apple-system,sans-serif;color:#111;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f6f6;padding:24px 12px 40px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;">
          <tr>
            <td align="center" style="padding:28px 24px 8px;">
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
            <td style="padding:20px 24px 32px;">${input.bodyHtml}</td>
          </tr>
        </table>

        <table role="presentation" width="100%" style="max-width:560px;margin-top:20px;">
          <tr>
            <td align="center" style="padding:0 12px;font-size:12px;line-height:1.55;color:#8a8a8a;">
              <p style="margin:0 0 10px;">${reason}</p>
              <p style="margin:0 0 4px;font-weight:600;color:#6b6b6b;">Naija Jollof Waterloo</p>
              <p style="margin:0 0 12px;">${escapeHtml(STORE_ADDRESS)}</p>
              <p style="margin:0 0 14px;">${footerLinksHtml()}</p>
            </td>
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
  const reason =
    "You’re receiving this because you created an account at Naija Jollof Waterloo.";
  const html = layout({
    title: subject,
    reason,
    bodyHtml: `<p style="margin:0 0 12px;font-size:16px;line-height:1.5;">Hi ${escapeHtml(first)},</p>
     <p style="margin:0 0 12px;font-size:15px;line-height:1.55;color:#444;">Your account is ready. Order pickup or delivery anytime, and track your orders from your account.</p>
     <p style="margin:24px 0 0;">
       <a href="${escapeHtml(input.accountUrl)}" style="display:inline-block;background:#CC5400;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;font-size:14px;font-weight:600;">View account</a>
     </p>`,
  });
  const text = `Hi ${first},\n\nYour Naija Jollof Waterloo account is ready.\nView account: ${input.accountUrl}\n\n${footerText(reason)}`;
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
  const reason =
    "You’re receiving this because you placed an order with Naija Jollof Waterloo.";
  const scheduleLine = input.scheduledLabel
    ? `<p style="margin:0 0 12px;font-size:15px;line-height:1.55;color:#444;">Scheduled for <strong>${escapeHtml(input.scheduledLabel)}</strong>.</p>`
    : "";
  const scheduleText = input.scheduledLabel
    ? `\nScheduled for ${input.scheduledLabel}.`
    : "";

  const html = layout({
    title: subject,
    reason,
    bodyHtml: `<p style="margin:0 0 12px;font-size:16px;line-height:1.5;">Hi ${escapeHtml(first)},</p>
     <p style="margin:0 0 12px;font-size:15px;line-height:1.55;color:#444;">We received your ${mode} order from <strong>${escapeHtml(input.storeName)}</strong>. Total ${escapeHtml(input.totalLabel)}.</p>
     ${scheduleLine}
     <p style="margin:24px 0 0;">
       <a href="${escapeHtml(input.trackUrl)}" style="display:inline-block;background:#CC5400;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;font-size:14px;font-weight:600;">Track order</a>
     </p>`,
  });
  const text = `Hi ${first},\n\nWe received your ${mode} order from ${input.storeName}. Total ${input.totalLabel}.${scheduleText}\n\nTrack order: ${input.trackUrl}\n\n${footerText(reason)}`;
  return { subject, html, text };
}

export function buildPasswordResetEmail(input: {
  name: string;
  resetUrl: string;
}): { subject: string; html: string; text: string } {
  const first = input.name.trim().split(/\s+/)[0] || "there";
  const subject = "Reset your password";
  const reason =
    "You’re receiving this because a password reset was requested for your Naija Jollof Waterloo account.";
  const html = layout({
    title: subject,
    reason,
    bodyHtml: `<p style="margin:0 0 12px;font-size:16px;line-height:1.5;">Hi ${escapeHtml(first)},</p>
     <p style="margin:0 0 12px;font-size:15px;line-height:1.55;color:#444;">We received a request to reset your Naija Jollof Waterloo password. This link expires in 1 hour.</p>
     <p style="margin:24px 0 0;">
       <a href="${escapeHtml(input.resetUrl)}" style="display:inline-block;background:#CC5400;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;font-size:14px;font-weight:600;">Reset password</a>
     </p>`,
  });
  const text = `Hi ${first},\n\nReset your password (expires in 1 hour):\n${input.resetUrl}\n\n${footerText(reason)}`;
  return { subject, html, text };
}

type OrderStatusEmailStatus =
  | "accepted"
  | "ready"
  | "ready_for_pickup"
  | "out_for_delivery"
  | "completed"
  | "cancelled";

function orderStatusCopy(input: {
  status: OrderStatusEmailStatus;
  fulfillmentType: "pickup" | "delivery";
  storeName: string;
}): { subject: string; headline: string; body: string; cta: string } {
  const store = input.storeName;
  switch (input.status) {
    case "accepted":
      return {
        subject: `Order accepted · ${store}`,
        headline: "We’ve got your order",
        body: `${store} accepted your order and the kitchen is getting started.`,
        cta: "Track order",
      };
    case "ready":
    case "ready_for_pickup":
      return {
        subject:
          input.fulfillmentType === "pickup"
            ? `Ready for pickup · ${store}`
            : `Order ready · ${store}`,
        headline:
          input.fulfillmentType === "pickup"
            ? "Ready for pickup"
            : "Your order is ready",
        body:
          input.fulfillmentType === "pickup"
            ? "Your order is ready. Head over when you can."
            : "Your order is ready and will be on its way shortly.",
        cta: "Track order",
      };
    case "out_for_delivery":
      return {
        subject: `On the way · ${store}`,
        headline: "Your order is on the way",
        body: "A courier is bringing your food. You can follow along with the track link.",
        cta: "Track order",
      };
    case "completed":
      return {
        subject: `Enjoy · ${store}`,
        headline: "Order complete",
        body: "Thanks for ordering with us. We hope it hits the spot.",
        cta: "View order",
      };
    case "cancelled":
      return {
        subject: `Order cancelled · ${store}`,
        headline: "Order cancelled",
        body: `Your order from ${store} was cancelled. If you were charged, reply to this email or contact ${CONTACT_EMAIL} and we’ll help with a refund.`,
        cta: "View order",
      };
  }
}

export function buildOrderStatusEmail(input: {
  customerName: string;
  storeName: string;
  status: OrderStatusEmailStatus;
  fulfillmentType: "pickup" | "delivery";
  trackUrl: string;
  courierTrackingUrl?: string | null;
  note?: string | null;
}): { subject: string; html: string; text: string } {
  const first = input.customerName.trim().split(/\s+/)[0] || "there";
  const copy = orderStatusCopy({
    status: input.status,
    fulfillmentType: input.fulfillmentType,
    storeName: input.storeName,
  });
  const reason =
    input.status === "cancelled"
      ? "You’re receiving this because an order with Naija Jollof Waterloo was cancelled."
      : "You’re receiving this because you placed an order with Naija Jollof Waterloo.";

  const noteLine = input.note?.trim()
    ? `<p style="margin:0 0 12px;font-size:14px;line-height:1.55;color:#666;">Note: ${escapeHtml(input.note.trim())}</p>`
    : "";
  const courierLine = input.courierTrackingUrl
    ? `<p style="margin:0 0 12px;font-size:14px;line-height:1.55;color:#666;"><a href="${escapeHtml(input.courierTrackingUrl)}" style="color:#CC5400;">Courier tracking</a></p>`
    : "";

  const html = layout({
    title: copy.subject,
    reason,
    bodyHtml: `<p style="margin:0 0 12px;font-size:16px;line-height:1.5;">Hi ${escapeHtml(first)},</p>
     <p style="margin:0 0 8px;font-size:18px;font-weight:600;letter-spacing:-0.02em;">${escapeHtml(copy.headline)}</p>
     <p style="margin:0 0 12px;font-size:15px;line-height:1.55;color:#444;">${escapeHtml(copy.body)}</p>
     ${noteLine}
     ${courierLine}
     <p style="margin:24px 0 0;">
       <a href="${escapeHtml(input.trackUrl)}" style="display:inline-block;background:#CC5400;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;font-size:14px;font-weight:600;">${escapeHtml(copy.cta)}</a>
     </p>`,
  });

  const textLines = [
    `Hi ${first},`,
    "",
    copy.headline,
    copy.body,
    input.note?.trim() ? `Note: ${input.note.trim()}` : null,
    input.courierTrackingUrl
      ? `Courier: ${input.courierTrackingUrl}`
      : null,
    `Track: ${input.trackUrl}`,
    "",
    footerText(reason),
  ].filter((line): line is string => line != null);

  return { subject: copy.subject, html, text: textLines.join("\n") };
}

/** Mailto used for List-Unsubscribe / marketing opt-out. */
export function getEmailUnsubscribeMailto(): string {
  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Unsubscribe from emails")}`;
}
