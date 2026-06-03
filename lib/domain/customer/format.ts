/** Display a stored E.164 phone as a friendly local number. */
export function formatPhoneForDisplay(phoneE164: string): string {
  const digits = phoneE164.replace(/\D/g, "");

  if (digits.length === 11 && digits.startsWith("1")) {
    const local = digits.slice(1);
    return `(${local.slice(0, 3)}) ${local.slice(3, 6)}-${local.slice(6)}`;
  }

  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  return phoneE164;
}

/** Prefill delivery form phone field from E.164. */
export function phoneE164ToFormValue(phoneE164: string): string {
  const digits = phoneE164.replace(/\D/g, "");

  if (digits.length === 11 && digits.startsWith("1")) {
    return digits.slice(1);
  }

  return digits;
}
