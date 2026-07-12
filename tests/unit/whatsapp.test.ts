import { createHmac } from "crypto";
import { describe, expect, it } from "vitest";
import {
  parseInteractiveSelection,
  parseNewCustomerFields,
  parseNewCustomerMultiline,
  parseNewCustomerOneLine,
  parseNewCustomerPartialMultiline,
  parsePlainCustomerMultiline,
  parseWhatsAppCommand,
} from "@/lib/domain/whatsapp/commands";
import { buildHelpMessage, buildSentMessage } from "@/lib/domain/whatsapp/messages";
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
        kind: "text",
        from: "15195550100",
        messageId: "wamid.test",
        text: "Val",
        phoneNumberId: "123456789",
        timestamp: undefined,
      },
    ]);
  });

  it("parses interactive button replies", () => {
    const body = JSON.stringify({
      object: "whatsapp_business_account",
      entry: [
        {
          changes: [
            {
              field: "messages",
              value: {
                metadata: { phone_number_id: "123456789" },
                messages: [
                  {
                    from: "15195550100",
                    id: "wamid.btn",
                    type: "interactive",
                    interactive: {
                      type: "button_reply",
                      button_reply: { id: "send", title: "Send" },
                    },
                  },
                ],
              },
            },
          ],
        },
      ],
    });

    expect(parseIncomingMessages(body)[0]).toMatchObject({
      kind: "interactive",
      interactiveId: "send",
    });
  });
});

describe("whatsapp command parser", () => {
  it("parses help, yes, cancel, ping, and customer names", () => {
    expect(parseWhatsAppCommand("HELP")).toEqual({ type: "help" });
    expect(parseWhatsAppCommand("yes")).toEqual({ type: "yes" });
    expect(parseWhatsAppCommand("cancel")).toEqual({ type: "cancel" });
    expect(parseWhatsAppCommand("ping")).toEqual({ type: "ping" });
    expect(parseWhatsAppCommand("Val")).toEqual({ type: "customer_name", name: "Val" });
    expect(parseWhatsAppCommand("2")).toEqual({ type: "pick", index: 2 });
  });

  it("parses NEW wizard and one-line formats", () => {
    expect(parseWhatsAppCommand("NEW")).toEqual({ type: "new_wizard", name: undefined });
    expect(parseWhatsAppCommand("NEW Val")).toEqual({ type: "new_wizard", name: "Val" });
    expect(parseWhatsAppCommand("NEW Val,5195550100,123 Roger St, Waterloo")).toEqual({
      type: "new_one_line",
      name: "Val",
      phone: "+15195550100",
      address: "123 Roger St, Waterloo",
    });
    expect(parseWhatsAppCommand("NEW Val|5195550100|123 Roger St, Waterloo")).toEqual({
      type: "new_one_line",
      name: "Val",
      phone: "+15195550100",
      address: "123 Roger St, Waterloo",
    });
  });

  it("parses interactive selections", () => {
    expect(parseInteractiveSelection("send")).toEqual({ type: "yes" });
    expect(parseInteractiveSelection("cust:abc123")).toEqual({
      type: "interactive",
      id: "cust:abc123",
      title: "",
    });
    expect(parseInteractiveSelection("prov:1")).toEqual({ type: "pick", index: 2 });
  });

  it("builds a short help message", () => {
    expect(buildHelpMessage()).toContain("NEW");
  });

  it("builds sent confirmation with name, address, and tracking", () => {
    expect(
      buildSentMessage({
        customerName: "Val T",
        dropoffAddress: "123 Roger St, Waterloo, ON",
        trackingUrl: "https://delivery.uber.com/track/abc",
      }),
    ).toBe(
      "✅ Sent\n📦 Val T\n📍 123 Roger St, Waterloo, ON\nTrack: https://delivery.uber.com/track/abc",
    );
    expect(
      buildSentMessage({
        customerName: "Val T",
        dropoffAddress: "123 Roger St, Waterloo, ON",
      }),
    ).not.toContain("Ref:");
  });

  it("parses one-line NEW with comma delimiter", () => {
    expect(parseNewCustomerOneLine("NEW Val,5195550100,123 Roger St, Waterloo")).toEqual({
      name: "Val",
      phone: "+15195550100",
      address: "123 Roger St, Waterloo",
    });
  });

  it("parses multiline NEW in one message", () => {
    const message = "NEW Val\n5193300303\n123 Roger St, Waterloo";
    expect(parseNewCustomerMultiline(message)).toEqual({
      name: "Val",
      phone: "+15193300303",
      address: "123 Roger St, Waterloo",
    });
    expect(parseWhatsAppCommand(message)).toEqual({
      type: "new_one_line",
      name: "Val",
      phone: "+15193300303",
      address: "123 Roger St, Waterloo",
    });
  });

  it("joins extra address lines in multiline NEW", () => {
    expect(
      parseNewCustomerMultiline("NEW Val\n5193300303\n123 Roger St\nWaterloo ON"),
    ).toEqual({
      name: "Val",
      phone: "+15193300303",
      address: "123 Roger St, Waterloo ON",
    });
  });

  it("parses NEW on its own line then name, phone, address", () => {
    expect(
      parseNewCustomerMultiline("NEW\nVal T\n5193300303\n123 Roger St, Waterloo"),
    ).toEqual({
      name: "Val T",
      phone: "+15193300303",
      address: "123 Roger St, Waterloo",
    });
  });

  it("continues wizard when multiline NEW has only name and phone", () => {
    expect(parseWhatsAppCommand("NEW Val\n5193300303")).toEqual({
      type: "new_wizard",
      name: "Val",
      phone: "+15193300303",
    });
  });

  it("rejects invalid multiline NEW blocks", () => {
    expect(parseWhatsAppCommand("NEW Val\nbadphone\n123 Roger St")).toEqual({
      type: "unknown",
      text: "NEW block needs 3 lines: name, phone, address — or use commas.",
    });
  });

  it("parseNewCustomerFields prefers one-line then multiline", () => {
    expect(parseNewCustomerFields("NEW Val|5195550100|123 Main St")).toBeTruthy();
    expect(parseNewCustomerFields("NEW Val\n5195550100\n123 Main St")).toBeTruthy();
  });

  it("ignores blank lines in multiline NEW", () => {
    expect(parseNewCustomerMultiline("NEW Val\n\n5193300303\n\n123 Roger St")).toEqual({
      name: "Val",
      phone: "+15193300303",
      address: "123 Roger St",
    });
  });

  it("parses NEW case-insensitively", () => {
    expect(parseWhatsAppCommand("new")).toEqual({ type: "new_wizard", name: undefined });
    expect(parseWhatsAppCommand("New Val")).toEqual({ type: "new_wizard", name: "Val" });
    expect(parseWhatsAppCommand("/NEW Val")).toEqual({ type: "new_wizard", name: "Val" });
    expect(parseWhatsAppCommand("nEw VaL\n5193300303\n123 Roger St, Waterloo")).toEqual({
      type: "new_one_line",
      name: "VaL",
      phone: "+15193300303",
      address: "123 Roger St, Waterloo",
    });
  });

  it("parses plain multiline without NEW prefix", () => {
    const message = "Val\n5193300303\n123 Roger St, Waterloo";
    expect(parsePlainCustomerMultiline(message)).toEqual({
      name: "Val",
      phone: "+15193300303",
      address: "123 Roger St, Waterloo",
    });
    expect(parseWhatsAppCommand(message)).toEqual({
      type: "new_one_line",
      name: "Val",
      phone: "+15193300303",
      address: "123 Roger St, Waterloo",
    });
  });

  it("parses plain one-line without NEW prefix", () => {
    expect(parseWhatsAppCommand("Val,5193300303,123 Roger St, Waterloo")).toEqual({
      type: "new_one_line",
      name: "Val",
      phone: "+15193300303",
      address: "123 Roger St, Waterloo",
    });
  });

  it("parses partial multiline for wizard seed", () => {
    expect(parseNewCustomerPartialMultiline("NEW Val\n5193300303")).toEqual({
      name: "Val",
      phone: "+15193300303",
    });
  });
});

describe("whatsapp phone normalization", () => {
  it("normalizes North American numbers to E.164", () => {
    expect(normalizeWhatsAppPhone("5195550100")).toBe("+15195550100");
  });
});
