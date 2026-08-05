/**
 * Square's `detail` strings are for developers (e.g. "Authorization error: 'GENERIC_DECLINE'").
 * Map codes to diner-facing copy. Prefer `code`; fall back to extracting a CODE from detail.
 *
 * @see https://developer.squareup.com/docs/payments-api/error-codes
 * @see https://developer.squareup.com/reference/square/enums/ErrorCode
 */

const FALLBACK =
  "We couldn't process this payment. Try another card or contact your bank.";

/** Buyer/card issues — safe to show specific guidance. */
const BUYER_MESSAGES: Record<string, string> = {
  GENERIC_DECLINE:
    "Your card was declined. Try another card or contact your bank for details.",
  CARD_DECLINED:
    "Your card was declined. Try another card or contact your bank for details.",
  CARD_DECLINED_CALL_ISSUER:
    "Your bank declined this card. Call the number on the back of your card, then try again.",
  CARD_DECLINED_VERIFICATION_REQUIRED:
    "Your bank needs extra verification for this card. Try again or use a different card.",
  INSUFFICIENT_FUNDS:
    "Your card doesn't have enough funds for this order. Try another card.",
  CVV_FAILURE:
    "The security code (CVV) doesn't match. Check the 3–4 digit code on your card.",
  VERIFY_CVV_FAILURE:
    "The security code (CVV) couldn't be verified. Check the code on your card and try again.",
  ADDRESS_VERIFICATION_FAILURE:
    "The billing postal code doesn't match your card. Check it and try again.",
  VERIFY_AVS_FAILURE:
    "The billing address couldn't be verified. Check your postal code and try again.",
  INVALID_POSTAL_CODE:
    "Enter a valid billing postal code for this card.",
  CARD_EXPIRED: "This card has expired. Use a different card.",
  INVALID_EXPIRATION:
    "The card expiration date looks wrong. Check the month and year.",
  INVALID_EXPIRATION_YEAR:
    "The card expiration year looks wrong. Check the year on your card.",
  INVALID_EXPIRATION_DATE:
    "The card expiration date looks wrong. Check the month and year.",
  EXPIRATION_FAILURE:
    "The card expiration date is invalid or the card has expired.",
  BAD_EXPIRATION:
    "Enter a valid card expiration date.",
  PAN_FAILURE:
    "The card number looks incorrect. Check the number and try again.",
  INVALID_CARD:
    "We couldn't validate this card. Check the details or try another card.",
  INVALID_CARD_DATA:
    "The card details look incorrect. Check them and try again.",
  INVALID_ACCOUNT:
    "Your bank couldn't find this card account. Try another card.",
  ACCOUNT_UNUSABLE:
    "This card can't be used for payments right now. Try another card.",
  TRANSACTION_LIMIT:
    "Your bank declined this amount. Try a smaller order or another card.",
  AMOUNT_TOO_HIGH:
    "This amount is too high for the card. Try another card.",
  PAYMENT_LIMIT_EXCEEDED:
    "This order is above what we can charge on a single payment. Contact the restaurant.",
  CARD_NOT_SUPPORTED:
    "This card isn't supported here. Try another card.",
  UNSUPPORTED_CARD_BRAND:
    "This card brand isn't supported. Try another card.",
  CARDHOLDER_INSUFFICIENT_PERMISSIONS:
    "This card can't be used for this purchase. Try another card.",
  BUYER_REFUSED_PAYMENT:
    "The payment wasn't authorized. Try another card or payment method.",
  INVALID_PIN: "The PIN is incorrect. Try again.",
  MISSING_PIN: "A PIN is required for this card.",
  ALLOWABLE_PIN_TRIES_EXCEEDED:
    "Too many incorrect PIN attempts. Contact your bank or try another card.",
  VOICE_FAILURE:
    "Your bank needs to approve this payment by phone. Call the number on your card, then try again.",
  CURRENCY_MISMATCH:
    "This card can't be charged in Canadian dollars. Try another card.",
  GIFT_CARD_AVAILABLE_AMOUNT:
    "This gift card doesn't cover the full order. Use another payment method.",
  CARD_TOKEN_EXPIRED:
    "Your card session expired. Re-enter your card details and try again.",
  CARD_TOKEN_USED:
    "That card session was already used. Re-enter your card details and try again.",
  SOURCE_EXPIRED:
    "Your card session expired. Re-enter your card details and try again.",
  SOURCE_USED:
    "That card session was already used. Re-enter your card details and try again.",
  CHIP_INSERTION_REQUIRED:
    "This card needs to be used in person. Try a different card for online checkout.",
  MANUALLY_ENTERED_PAYMENT_NOT_SUPPORTED:
    "This card can't be typed in online. Try another card.",
};

/** Merchant/config/infra — don't expose Square internals. */
const MERCHANT_MESSAGES: Record<string, string> = {
  CARD_PROCESSING_NOT_ENABLED:
    "Card payments aren't available right now. Contact the restaurant.",
  INVALID_LOCATION:
    "Card payments aren't available right now. Contact the restaurant.",
  LOCATION_MISMATCH:
    "Card payments aren't available right now. Contact the restaurant.",
  INSUFFICIENT_PERMISSIONS:
    "Card payments aren't available right now. Contact the restaurant.",
  PAYMENT_AMOUNT_MISMATCH:
    "Something went wrong with the order total. Refresh and try again.",
  IDEMPOTENCY_KEY_REUSED:
    "This payment was already submitted. Check your orders or try again in a moment.",
  RATE_LIMITED:
    "Too many payment attempts. Wait a moment and try again.",
  TEMPORARY_ERROR:
    "Payment is temporarily unavailable. Wait a moment and try again.",
  REQUEST_TIMEOUT:
    "The payment timed out. Try again.",
  GATEWAY_TIMEOUT:
    "The payment timed out. Try again.",
  SERVICE_UNAVAILABLE:
    "Payment is temporarily unavailable. Try again in a moment.",
  BAD_GATEWAY:
    "Payment is temporarily unavailable. Try again in a moment.",
  INTERNAL_SERVER_ERROR:
    "Payment is temporarily unavailable. Try again in a moment.",
};

const CODE_IN_DETAIL = /'([A-Z][A-Z0-9_]+)'/;
const AUTHORIZATION_DETAIL = /^Authorization error:/i;

function normalizeCode(code: string | null | undefined): string | null {
  if (!code || typeof code !== "string") return null;
  const trimmed = code.trim().toUpperCase();
  return trimmed.length > 0 ? trimmed : null;
}

/** Pull GENERIC_DECLINE out of "Authorization error: 'GENERIC_DECLINE'". */
export function extractSquareErrorCode(
  code?: string | null,
  detail?: string | null,
  message?: string | null,
): string | null {
  const direct = normalizeCode(code);
  if (direct) return direct;

  for (const text of [detail, message]) {
    if (!text) continue;
    const match = CODE_IN_DETAIL.exec(text);
    if (match?.[1]) return normalizeCode(match[1]);
  }
  return null;
}

export function isSquareBuyerDeclineCode(code: string | null): boolean {
  if (!code) return false;
  return Object.prototype.hasOwnProperty.call(BUYER_MESSAGES, code);
}

export function squareCodeToUserMessage(
  code: string | null,
  fallback: string = FALLBACK,
): string {
  if (!code) return fallback;
  return BUYER_MESSAGES[code] ?? MERCHANT_MESSAGES[code] ?? fallback;
}

export function squareErrorToUserMessage(input: {
  code?: string | null;
  detail?: string | null;
  message?: string | null;
  fallback?: string;
}): string {
  const fallback = input.fallback ?? FALLBACK;
  const code = extractSquareErrorCode(input.code, input.detail, input.message);
  if (code) {
    return squareCodeToUserMessage(code, fallback);
  }

  const detail = input.detail?.trim() || input.message?.trim() || "";
  if (!detail || AUTHORIZATION_DETAIL.test(detail)) {
    return fallback;
  }
  // Avoid leaking raw Square developer detail strings.
  if (/^[A-Z][A-Z0-9_]+$/.test(detail)) {
    return squareCodeToUserMessage(detail, fallback);
  }
  if (/error:/i.test(detail) || /square/i.test(detail)) {
    return fallback;
  }
  return fallback;
}

/** Map Web Payments SDK tokenize / verify error payloads. */
export function squareWebSdkErrorsToUserMessage(
  errors: Array<{ code?: string; message?: string }> | undefined,
  fallback = "Check your card details and try again.",
): string {
  if (!errors?.length) return fallback;
  for (const error of errors) {
    const code = extractSquareErrorCode(error.code, error.message, error.message);
    if (code && (BUYER_MESSAGES[code] || MERCHANT_MESSAGES[code])) {
      return squareCodeToUserMessage(code, fallback);
    }
  }
  const joined = errors
    .map((error) => error.message)
    .filter(Boolean)
    .join(" ");
  if (joined && !AUTHORIZATION_DETAIL.test(joined) && !/'[A-Z_]+'/.test(joined)) {
    return joined;
  }
  return fallback;
}
