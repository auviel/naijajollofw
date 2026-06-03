import { createHmac } from "crypto";
import { describe, expect, it } from "vitest";
import {
  buildHelpMessage,
  parseWhatsAppCommand,
} from "@/lib/domain/whatsapp/types";
import {
  parseIncomingMessages,
  verifyWebhookChallenge,
  verifyWebhookSignature,
} from "@/lib/integrations/whatsapp/webhook";
import { normalizeWhatsAppPhone } from "@/lib/utils/whatsapp-phone";

const testSecret = "test-app-secret";

function signBody(body: string, secret: string): string {
  return `sha256=${createHmac("sha256", secret).update(body, "utf8").digest("hex")}`;
}

describe("whatsapp webhook verification", () => {
  it("returns the challenge when verify token matches", () => {
    expect(
      verifyWebhookChallenge({
        mode: "subscribe",
        verifyToken: "my-token",
        challenge: "123456",
        expectedVerifyToken: "my-token",
      }),
    ).toBe("123456");
  });

  it("rejects invalid verify tokens", () => {
    expect(
      verifyWebhookChallenge({
        mode: "subscribe",
        verifyToken: "wrong",
        challenge: "123456",
        expectedVerifyToken: "my-token",
      }),
    ).toBeNull();
  });

  it("verifies a valid X-Hub-Signature-256", () => {
    const body = JSON.stringify({ object: "whatsapp_business_account", entry: [] });
    expect(verifyWebhookSignature(body, signBody(body, testSecret), testSecret)).toBe(true);
  });

  it("parses incoming text messages", () => {
    const body = JSON.stringify({
      object: "whatsapp_business_account",
      entry: [
        {
          changes: [
            {
              field: "messages",
              value: {
                messaging_product: "whatsapp",
                metadata: { phone_number_id: "123456789" },
                messages: [
                  {
                    from: "15195550100",
                    id: "wamid.test",
                    type: "text",
                    text: { body: "Val" },
                  },
                ],
              },
            },
          ],
        },
      ],
    });

    const messages = parseIncomingMessages(body);
    expect(messages).toEqual([
      {
        from: "15195550100",
        messageId: "wamid.test",
        text: "Val",
        phoneNumberId: "123456789",
        timestamp: undefined,
      },
    ]);
  });
});

describe("whatsapp command parser", () => {
  it("parses help, yes, cancel, ping, and customer names", () => {
    expect(parseWhatsAppCommand("HELP")).toEqual({ type: "help" });
    expect(parseWhatsAppCommand("yes")).toEqual({ type: "yes" });
    expect(parseWhatsAppCommand("cancel")).toEqual({ type: "cancel" });
    expect(parseWhatsAppCommand("ping")).toEqual({ type: "ping" });
    expect(parseWhatsAppCommand("Val")).toEqual({ type: "customer_name", name: "Val" });
    expect(parseWhatsAppCommand("send Val")).toEqual({ type: "customer_name", name: "Val" });
    expect(parseWhatsAppCommand("2")).toEqual({ type: "pick", index: 2 });
  });

  it("builds a help message", () => {
    expect(buildHelpMessage()).toContain("Send a customer name");
  });
});

describe("whatsapp phone normalization", () => {
  it("normalizes North American numbers to E.164", () => {
    expect(normalizeWhatsAppPhone("5195550100")).toBe("+15195550100");
    expect(normalizeWhatsAppPhone("15195550100")).toBe("+15195550100");
  });
});
