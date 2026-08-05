import { createHmac } from "crypto";
import { afterEach, describe, expect, it } from "vitest";
import {
  isValidSquareSignature,
  parseSquareWebhookEvent,
  verifySquareWebhookSignature,
} from "@/lib/integrations/payments/square/webhook";

const notificationUrl = "https://new.naijajollofw.ca/api/webhooks/square";
const signatureKey = "test-square-signature-key";
const body = JSON.stringify({
  type: "payment.created",
  event_id: "evt_test",
  data: { object: { payment: { id: "pay_test", status: "COMPLETED" } } },
});

function sign(url: string, payload: string, key: string): string {
  return createHmac("sha256", key)
    .update(url + payload, "utf8")
    .digest("base64");
}

describe("square webhook verification", () => {
  const original = {
    key: process.env.SQUARE_WEBHOOK_SIGNATURE_KEY,
    url: process.env.SQUARE_WEBHOOK_NOTIFICATION_URL,
    appUrl: process.env.NEXT_PUBLIC_APP_URL,
  };

  afterEach(() => {
    process.env.SQUARE_WEBHOOK_SIGNATURE_KEY = original.key;
    process.env.SQUARE_WEBHOOK_NOTIFICATION_URL = original.url;
    process.env.NEXT_PUBLIC_APP_URL = original.appUrl;
  });

  it("accepts a signature signed with the notification URL + body", () => {
    expect(
      isValidSquareSignature({
        notificationUrl,
        requestBody: body,
        signatureKey,
        signatureHeader: sign(notificationUrl, body, signatureKey),
      }),
    ).toBe(true);
  });

  it("rejects a tampered body", () => {
    expect(
      isValidSquareSignature({
        notificationUrl,
        requestBody: body,
        signatureKey,
        signatureHeader: sign(notificationUrl, `${body} `, signatureKey),
      }),
    ).toBe(false);
  });

  it("verifies using the public request URL when env URL is wrong", () => {
    process.env.SQUARE_WEBHOOK_SIGNATURE_KEY = signatureKey;
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    delete process.env.SQUARE_WEBHOOK_NOTIFICATION_URL;

    expect(() =>
      verifySquareWebhookSignature(
        body,
        sign(notificationUrl, body, signatureKey),
        notificationUrl,
      ),
    ).not.toThrow();
  });

  it("parses payment events and ignores invoice payloads structurally", () => {
    const payment = parseSquareWebhookEvent(body);
    expect(payment.type).toBe("payment.created");
    expect(payment.data?.object?.payment?.id).toBe("pay_test");

    const invoice = parseSquareWebhookEvent(
      JSON.stringify({ type: "invoice.payment_made", data: { object: { invoice: {} } } }),
    );
    expect(invoice.type).toBe("invoice.payment_made");
    expect(invoice.data?.object?.payment).toBeUndefined();
  });
});
