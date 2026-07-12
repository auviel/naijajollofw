/**
 * Resolve staff email recipients:
 * store profile email + store managers + optional STAFF_NOTIFY_EMAILS.
 */

export function parseStaffNotifyEmailsFromEnv(
  raw: string | undefined = process.env.STAFF_NOTIFY_EMAILS,
): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter((email) => email.includes("@"));
}

export function mergeStaffNotifyRecipients(input: {
  storeEmail?: string | null;
  managerEmails?: string[];
  envEmails?: string[];
}): string[] {
  const managers = input.managerEmails ?? [];
  const envEmails = input.envEmails ?? parseStaffNotifyEmailsFromEnv();
  const storeEmail = input.storeEmail?.trim().toLowerCase() || "";

  const seen = new Set<string>();
  const out: string[] = [];
  for (const email of [
    ...(storeEmail ? [storeEmail] : []),
    ...managers,
    ...envEmails,
  ]) {
    const normalized = email.trim().toLowerCase();
    if (!normalized || !normalized.includes("@") || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    out.push(normalized);
  }
  return out;
}
