/** Normalize WhatsApp sender IDs to E.164 (+1XXXXXXXXXX for North America). */
export function normalizeWhatsAppPhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");

  if (digits.length === 10) {
    return `+1${digits}`;
  }

  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }

  if (input.startsWith("+") && digits.length >= 10) {
    return `+${digits}`;
  }

  return null;
}
