import { getAppBaseUrl } from "@/lib/integrations/email/resend-client";
import { formatCadFromCents } from "@/lib/utils/currency";

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
                width="140"
                height="38"
                style="display:block;border:0;outline:none;text-decoration:none;width:140px;max-width:100%;height:auto;"
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

export type OrderConfirmationLine = {
  name: string;
  quantity: number;
  lineTotalCents: number;
  modifierNames?: string[];
};

function receiptTotalRowHtml(
  label: string,
  cents: number,
  variant: "quiet" | "total" = "quiet",
): string {
  const quiet = variant === "quiet";
  return `<tr>
      <td style="padding:${quiet ? "4px 0" : "8px 0 0"};font-size:${quiet ? "14px" : "15px"};font-weight:${quiet ? "400" : "700"};color:${quiet ? "#666" : "#111"};">${label}</td>
      <td align="right" style="padding:${quiet ? "4px 0 4px 12px" : "8px 0 0 12px"};font-size:${quiet ? "14px" : "15px"};font-weight:${quiet ? "400" : "700"};color:${quiet ? "#666" : "#111"};white-space:nowrap;">${escapeHtml(formatCadFromCents(cents))}</td>
    </tr>`;
}

function receiptHtml(input: {
  lines: OrderConfirmationLine[];
  subtotalCents: number;
  taxCents: number;
  tipCents: number;
  totalCents: number;
}): string {
  const itemRows =
    input.lines.length === 0
      ? ""
      : input.lines
          .map((line) => {
            const modifiers = (line.modifierNames ?? [])
              .map((name) => name.trim())
              .filter(Boolean)
              .join(", ");
            return `<tr>
      <td style="padding:8px 0;font-size:14px;line-height:1.45;color:#111;vertical-align:top;">
        ${escapeHtml(`${line.quantity}× ${line.name}`)}
        ${
          modifiers
            ? `<br /><span style="font-size:13px;color:#666;">${escapeHtml(modifiers)}</span>`
            : ""
        }
      </td>
      <td align="right" style="padding:8px 0 8px 12px;font-size:14px;color:#444;white-space:nowrap;vertical-align:top;">${escapeHtml(formatCadFromCents(line.lineTotalCents))}</td>
    </tr>`;
          })
          .join("");

  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:4px 0 8px;border-collapse:collapse;">
    ${itemRows}
    <tr>
      <td colspan="2" style="padding:8px 0 4px;border-top:1px solid #eee;font-size:0;line-height:0;">&nbsp;</td>
    </tr>
    ${receiptTotalRowHtml("Subtotal", input.subtotalCents)}
    ${receiptTotalRowHtml("Tax", input.taxCents)}
    ${input.tipCents > 0 ? receiptTotalRowHtml("Tip", input.tipCents) : ""}
    ${receiptTotalRowHtml("Total", input.totalCents, "total")}
  </table>`;
}

function receiptText(input: {
  lines: OrderConfirmationLine[];
  subtotalCents: number;
  taxCents: number;
  tipCents: number;
  totalCents: number;
}): string {
  const items = input.lines.map((line) => {
    const modifiers = (line.modifierNames ?? [])
      .map((name) => name.trim())
      .filter(Boolean)
      .join(", ");
    const head = `${line.quantity}× ${line.name}  ${formatCadFromCents(line.lineTotalCents)}`;
    return modifiers ? `${head}\n  ${modifiers}` : head;
  });

  const totals = [
    `Subtotal  ${formatCadFromCents(input.subtotalCents)}`,
    `Tax  ${formatCadFromCents(input.taxCents)}`,
    input.tipCents > 0 ? `Tip  ${formatCadFromCents(input.tipCents)}` : null,
    `Total  ${formatCadFromCents(input.totalCents)}`,
  ].filter((line): line is string => line != null);

  return [...items, "", ...totals].join("\n");
}

export function buildOrderConfirmationEmail(input: {
  customerName: string;
  storeName: string;
  fulfillmentType: "pickup" | "delivery";
  trackUrl: string;
  scheduledLabel?: string | null;
  displayNumber?: string | null;
  dropoffAddress?: string | null;
  lines: OrderConfirmationLine[];
  subtotalCents: number;
  taxCents: number;
  tipCents?: number;
  totalCents: number;
}): { subject: string; html: string; text: string } {
  const first = input.customerName.trim().split(/\s+/)[0] || "there";
  const mode = input.fulfillmentType === "delivery" ? "delivery" : "pickup";
  const orderLabel = input.displayNumber?.trim() || null;
  const tipCents = input.tipCents ?? 0;
  const subject = orderLabel
    ? `Order ${orderLabel} confirmed · ${input.storeName}`
    : `Order confirmed · ${input.storeName}`;
  const reason =
    "You’re receiving this because you placed an order with Naija Jollof Waterloo.";
  const scheduleLine = input.scheduledLabel
    ? `<p style="margin:0 0 12px;font-size:15px;line-height:1.55;color:#444;">Scheduled for <strong>${escapeHtml(input.scheduledLabel)}</strong></p>`
    : "";
  const scheduleText = input.scheduledLabel
    ? `Scheduled for ${input.scheduledLabel}`
    : null;
  const numberLine = orderLabel
    ? `<p style="margin:0 0 12px;font-size:15px;line-height:1.55;color:#444;">Order <strong>${escapeHtml(orderLabel)}</strong></p>`
    : "";
  const numberText = orderLabel ? `Order ${orderLabel}` : null;
  const addressLine =
    input.fulfillmentType === "delivery" && input.dropoffAddress?.trim()
      ? `<p style="margin:0 0 12px;font-size:14px;line-height:1.55;color:#666;">Delivering to ${escapeHtml(input.dropoffAddress.trim())}</p>`
      : "";
  const addressText =
    input.fulfillmentType === "delivery" && input.dropoffAddress?.trim()
      ? `Delivering to ${input.dropoffAddress.trim()}`
      : null;
  const receipt = {
    lines: input.lines,
    subtotalCents: input.subtotalCents,
    taxCents: input.taxCents,
    tipCents,
    totalCents: input.totalCents,
  };

  const html = layout({
    title: subject,
    reason,
    bodyHtml: `<p style="margin:0 0 12px;font-size:16px;line-height:1.5;">Hi ${escapeHtml(first)},</p>
     ${numberLine}
     <p style="margin:0 0 12px;font-size:15px;line-height:1.55;color:#444;">We received your ${mode} order from <strong>${escapeHtml(input.storeName)}</strong>.</p>
     ${scheduleLine}
     ${addressLine}
     ${receiptHtml(receipt)}
     <p style="margin:24px 0 0;">
       <a href="${escapeHtml(input.trackUrl)}" style="display:inline-block;background:#CC5400;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;font-size:14px;font-weight:600;">Track order</a>
     </p>`,
  });

  const text = [
    `Hi ${first},`,
    numberText,
    "",
    `We received your ${mode} order from ${input.storeName}.`,
    scheduleText,
    addressText,
    "",
    receiptText(receipt),
    "",
    `Track order: ${input.trackUrl}`,
    "",
    footerText(reason),
  ]
    .filter((line): line is string => line != null)
    .join("\n");

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

export function buildStaffOtpEmail(input: {
  name: string;
  code: string;
  purpose: "password_change" | "password_reset" | "email_change";
}): { subject: string; html: string; text: string } {
  const first = input.name.trim().split(/\s+/)[0] || "there";
  const isEmail = input.purpose === "email_change";
  const isReset = input.purpose === "password_reset";
  const subject = isEmail
    ? "Confirm your new email"
    : isReset
      ? "Your password reset code"
      : "Your password change code";
  const reason = isEmail
    ? "You’re receiving this because an email change was requested on your staff account."
    : isReset
      ? "You’re receiving this because a password reset was requested for your kitchen staff account."
      : "You’re receiving this because a password change was requested on your staff account.";
  const intro = isEmail
    ? "Use this code to confirm your new email address. It expires in 10 minutes."
    : isReset
      ? "Use this code in the Kitchen app to set a new password. It expires in 10 minutes."
      : "Use this code to finish changing your password. It expires in 10 minutes.";
  const html = layout({
    title: subject,
    reason,
    bodyHtml: `<p style="margin:0 0 12px;font-size:16px;line-height:1.5;">Hi ${escapeHtml(first)},</p>
     <p style="margin:0 0 12px;font-size:15px;line-height:1.55;color:#444;">${escapeHtml(intro)}</p>
     <p style="margin:20px 0;font-size:28px;letter-spacing:0.35em;font-weight:700;text-align:center;">${escapeHtml(input.code)}</p>
     <p style="margin:0;font-size:13px;line-height:1.5;color:#71717a;">If you didn’t request this, you can ignore this email.</p>`,
  });
  const text = `Hi ${first},\n\n${intro}\n\nCode: ${input.code}\n\n${footerText(reason)}`;
  return { subject, html, text };
}

export function buildEmailVerificationEmail(input: {
  name: string;
  verifyUrl: string;
  welcome?: boolean;
}): { subject: string; html: string; text: string } {
  const first = input.name.trim().split(/\s+/)[0] || "there";
  const subject = input.welcome
    ? "Welcome — verify your email"
    : "Verify your email";
  const reason =
    "You’re receiving this because you created or updated a Naija Jollof Waterloo account.";
  const intro = input.welcome
    ? "Welcome to Naija Jollof Waterloo. Confirm your email so we know it’s really you. This link expires in 48 hours."
    : "Confirm your email so we know it’s really you. This link expires in 48 hours.";
  const html = layout({
    title: subject,
    reason,
    bodyHtml: `<p style="margin:0 0 12px;font-size:16px;line-height:1.5;">Hi ${escapeHtml(first)},</p>
     <p style="margin:0 0 12px;font-size:15px;line-height:1.55;color:#444;">${escapeHtml(intro)}</p>
     <p style="margin:24px 0 0;">
       <a href="${escapeHtml(input.verifyUrl)}" style="display:inline-block;background:#CC5400;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;font-size:14px;font-weight:600;">Verify email</a>
     </p>`,
  });
  const text = `Hi ${first},\n\n${intro}\n${input.verifyUrl}\n\n${footerText(reason)}`;
  return { subject, html, text };
}

type OrderStatusEmailStatus =
  | "accepted"
  | "ready"
  | "ready_for_pickup"
  | "out_for_delivery"
  | "cancelled";

function orderStatusCopy(input: {
  status: OrderStatusEmailStatus;
  fulfillmentType: "pickup" | "delivery";
  storeName: string;
  displayNumber?: string | null;
}): { subject: string; headline: string; body: string; cta: string } {
  const store = input.storeName;
  const ref = input.displayNumber?.trim();
  const withRef = (label: string) => (ref ? `${label} ${ref} · ${store}` : `${label} · ${store}`);
  switch (input.status) {
    case "accepted":
      return {
        subject: withRef("Order accepted"),
        headline: "We’ve got your order",
        body: `${store} accepted your order${ref ? ` ${ref}` : ""} and the kitchen is getting started.`,
        cta: "Track order",
      };
    case "ready":
    case "ready_for_pickup":
      return {
        subject:
          input.fulfillmentType === "pickup"
            ? withRef("Ready for pickup")
            : withRef("Order ready"),
        headline:
          input.fulfillmentType === "pickup"
            ? "Ready for pickup"
            : "Your order is ready",
        body:
          input.fulfillmentType === "pickup"
            ? `Your order${ref ? ` ${ref}` : ""} is ready. Head over when you can.`
            : `Your order${ref ? ` ${ref}` : ""} is ready and will be on its way shortly.`,
        cta: "Track order",
      };
    case "out_for_delivery":
      return {
        subject: withRef("On the way"),
        headline: "Your order is on the way",
        body: `A courier is bringing your food${ref ? ` (${ref})` : ""}. You can follow along with the track link.`,
        cta: "Track order",
      };
    case "cancelled":
      return {
        subject: withRef("Order cancelled"),
        headline: "Order cancelled",
        body: `Your order${ref ? ` ${ref}` : ""} from ${store} was cancelled. If you were charged, reply to this email or contact ${CONTACT_EMAIL} and we’ll help with a refund.`,
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
  displayNumber?: string | null;
}): { subject: string; html: string; text: string } {
  const first = input.customerName.trim().split(/\s+/)[0] || "there";
  const copy = orderStatusCopy({
    status: input.status,
    fulfillmentType: input.fulfillmentType,
    storeName: input.storeName,
    displayNumber: input.displayNumber,
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

export function buildStaffNewOrderEmail(input: {
  storeName: string;
  orderId: string;
  customerName: string;
  customerPhone: string;
  fulfillmentType: "pickup" | "delivery";
  totalLabel: string;
  itemSummary: string;
  dashboardUrl: string;
  scheduledLabel?: string | null;
  displayNumber?: string | null;
}): { subject: string; html: string; text: string } {
  const ref = input.displayNumber?.trim() || "";
  const subject = ref
    ? `New order ${ref} · ${input.storeName}`
    : `New order · ${input.storeName}`;
  const reason = `You’re receiving this because you’re a staff contact for ${input.storeName}.`;
  const mode = input.fulfillmentType === "delivery" ? "Delivery" : "Pickup";
  const scheduleLine = input.scheduledLabel
    ? `<p style="margin:0 0 12px;font-size:15px;line-height:1.55;color:#444;">Scheduled for <strong>${escapeHtml(input.scheduledLabel)}</strong>.</p>`
    : "";
  const scheduleText = input.scheduledLabel
    ? `\nScheduled for ${input.scheduledLabel}.`
    : "";
  const refLine = ref
    ? `<p style="margin:0 0 8px;font-size:18px;font-weight:600;letter-spacing:-0.02em;">${escapeHtml(ref)}</p>`
    : `<p style="margin:0 0 8px;font-size:18px;font-weight:600;letter-spacing:-0.02em;">New order needs acceptance</p>`;

  const html = layout({
    title: subject,
    reason,
    bodyHtml: `${refLine}
     <p style="margin:0 0 12px;font-size:15px;line-height:1.55;color:#444;"><strong>${escapeHtml(input.customerName)}</strong> · ${escapeHtml(input.customerPhone)}</p>
     <p style="margin:0 0 8px;font-size:15px;line-height:1.55;color:#444;">${escapeHtml(mode)} · ${escapeHtml(input.totalLabel)}</p>
     <p style="margin:0 0 12px;font-size:14px;line-height:1.55;color:#666;">${escapeHtml(input.itemSummary)}</p>
     ${scheduleLine}
     <p style="margin:24px 0 0;">
       <a href="${escapeHtml(input.dashboardUrl)}" style="display:inline-block;background:#CC5400;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;font-size:14px;font-weight:600;">Open order</a>
     </p>`,
  });

  const text = [
    ref || "New order needs acceptance",
    "",
    `${input.customerName} · ${input.customerPhone}`,
    `${mode} · ${input.totalLabel}`,
    input.itemSummary,
    scheduleText.trim() || null,
    "",
    `Open order: ${input.dashboardUrl}`,
    "",
    footerText(reason),
  ]
    .filter((line): line is string => line != null)
    .join("\n");

  return { subject, html, text };
}

export function buildStaffOrderCancelledEmail(input: {
  storeName: string;
  orderId: string;
  customerName: string;
  totalLabel: string;
  dashboardUrl: string;
  note?: string | null;
  displayNumber?: string | null;
}): { subject: string; html: string; text: string } {
  const ref = input.displayNumber?.trim();
  const subject = ref
    ? `Order ${ref} cancelled · ${input.storeName}`
    : `Order cancelled · ${input.storeName}`;
  const reason = `You’re receiving this because you’re a staff contact for ${input.storeName}.`;
  const noteLine = input.note?.trim()
    ? `<p style="margin:0 0 12px;font-size:14px;line-height:1.55;color:#666;">Note: ${escapeHtml(input.note.trim())}</p>`
    : "";
  const noteText = input.note?.trim() ? `Note: ${input.note.trim()}` : null;

  const html = layout({
    title: subject,
    reason,
    bodyHtml: `<p style="margin:0 0 8px;font-size:18px;font-weight:600;letter-spacing:-0.02em;">${ref ? escapeHtml(`${ref} cancelled`) : "Order cancelled"}</p>
     <p style="margin:0 0 12px;font-size:15px;line-height:1.55;color:#444;"><strong>${escapeHtml(input.customerName)}</strong> · ${escapeHtml(input.totalLabel)}</p>
     ${noteLine}
     <p style="margin:24px 0 0;">
       <a href="${escapeHtml(input.dashboardUrl)}" style="display:inline-block;background:#CC5400;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;font-size:14px;font-weight:600;">View order</a>
     </p>`,
  });

  const text = [
    ref ? `${ref} cancelled` : "Order cancelled",
    "",
    `${input.customerName} · ${input.totalLabel}`,
    noteText,
    "",
    `View order: ${input.dashboardUrl}`,
    "",
    footerText(reason),
  ]
    .filter((line): line is string => line != null)
    .join("\n");

  return { subject, html, text };
}

/** Mailto used for List-Unsubscribe / marketing opt-out. */
export function getEmailUnsubscribeMailto(): string {
  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Unsubscribe from emails")}`;
}
