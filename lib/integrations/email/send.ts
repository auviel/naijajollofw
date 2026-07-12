import {
  getEmailFrom,
  getEmailReplyTo,
  getResendClient,
  isResendConfigured,
} from "@/lib/integrations/email/resend-client";
import { getEmailUnsubscribeMailto } from "@/lib/integrations/email/templates";
import { logger } from "@/lib/utils/logger";

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
  idempotencyKey: string;
};

export type SendEmailResult =
  | { ok: true; id: string }
  | { ok: false; skipped?: boolean; error?: string };

export async function sendEmail(
  input: SendEmailInput,
): Promise<SendEmailResult> {
  if (!isResendConfigured()) {
    logger.warn("email.skipped_no_api_key", {
      to: input.to,
      subject: input.subject,
      idempotencyKey: input.idempotencyKey,
    });
    return { ok: false, skipped: true };
  }

  const resend = getResendClient();
  if (!resend) {
    return { ok: false, skipped: true };
  }

  const replyTo = getEmailReplyTo();
  const { data, error } = await resend.emails.send(
    {
      from: getEmailFrom(),
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
      headers: {
        "List-Unsubscribe": `<${getEmailUnsubscribeMailto()}>`,
      },
      ...(replyTo ? { replyTo } : {}),
    },
    { idempotencyKey: input.idempotencyKey },
  );

  if (error) {
    logger.error("email.send_failed", {
      to: input.to,
      subject: input.subject,
      idempotencyKey: input.idempotencyKey,
      error: error.message,
    });
    return { ok: false, error: error.message };
  }

  logger.info("email.sent", {
    id: data?.id,
    to: input.to,
    subject: input.subject,
    idempotencyKey: input.idempotencyKey,
  });

  return { ok: true, id: data?.id ?? "" };
}

/** Fire-and-forget helper — never throws to callers. */
export function sendEmailInBackground(input: SendEmailInput): void {
  void sendEmail(input).catch((error) => {
    logger.error("email.background_failed", {
      to: input.to,
      subject: input.subject,
      error: error instanceof Error ? error.message : String(error),
    });
  });
}
