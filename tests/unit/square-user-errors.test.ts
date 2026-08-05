import { describe, expect, it } from "vitest";
import {
  extractSquareErrorCode,
  isSquareBuyerDeclineCode,
  squareErrorToUserMessage,
  squareWebSdkErrorsToUserMessage,
} from "@/lib/integrations/payments/square/user-errors";

describe("extractSquareErrorCode", () => {
  it("prefers the explicit code", () => {
    expect(
      extractSquareErrorCode(
        "INSUFFICIENT_FUNDS",
        "Authorization error: 'GENERIC_DECLINE'",
      ),
    ).toBe("INSUFFICIENT_FUNDS");
  });

  it("parses Authorization error detail strings", () => {
    expect(
      extractSquareErrorCode(
        undefined,
        "Authorization error: 'GENERIC_DECLINE'",
      ),
    ).toBe("GENERIC_DECLINE");
  });
});

describe("squareErrorToUserMessage", () => {
  it("maps GENERIC_DECLINE to a friendly decline message", () => {
    const message = squareErrorToUserMessage({
      code: "GENERIC_DECLINE",
      detail: "Authorization error: 'GENERIC_DECLINE'",
    });
    expect(message).not.toContain("GENERIC_DECLINE");
    expect(message).not.toContain("Authorization error");
    expect(message.toLowerCase()).toContain("declined");
  });

  it("maps insufficient funds specifically", () => {
    expect(
      squareErrorToUserMessage({ code: "INSUFFICIENT_FUNDS" }).toLowerCase(),
    ).toContain("enough funds");
  });

  it("maps CVV failures", () => {
    expect(
      squareErrorToUserMessage({
        detail: "Authorization error: 'CVV_FAILURE'",
      }).toLowerCase(),
    ).toMatch(/security code|cvv/);
  });

  it("does not leak raw Square detail when code is unknown", () => {
    const message = squareErrorToUserMessage({
      detail: "Authorization error: 'SOME_NEW_CODE'",
    });
    expect(message).not.toContain("Authorization error");
    expect(message).not.toContain("SOME_NEW_CODE");
  });

  it("uses merchant-safe copy for processing disabled", () => {
    expect(
      squareErrorToUserMessage({ code: "CARD_PROCESSING_NOT_ENABLED" }),
    ).toMatch(/aren't available|contact the restaurant/i);
  });
});

describe("isSquareBuyerDeclineCode", () => {
  it("flags buyer declines vs merchant errors", () => {
    expect(isSquareBuyerDeclineCode("GENERIC_DECLINE")).toBe(true);
    expect(isSquareBuyerDeclineCode("CARD_PROCESSING_NOT_ENABLED")).toBe(false);
  });
});

describe("squareWebSdkErrorsToUserMessage", () => {
  it("maps Web SDK error codes", () => {
    expect(
      squareWebSdkErrorsToUserMessage([
        { code: "VERIFY_CVV_FAILURE", message: "CVV could not be verified." },
      ]).toLowerCase(),
    ).toMatch(/security code|cvv/);
  });

  it("keeps harmless Web SDK messages", () => {
    expect(
      squareWebSdkErrorsToUserMessage([
        { message: "Card number is invalid." },
      ]),
    ).toBe("Card number is invalid.");
  });
});
