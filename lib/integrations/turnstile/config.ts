export function getTurnstileSiteKey(): string | null {
  const value = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();
  return value || null;
}

export function getTurnstileSecretKey(): string | null {
  const value = process.env.TURNSTILE_SECRET_KEY?.trim();
  return value || null;
}

/** Widget + Siteverify both configured. */
export function isTurnstileEnabled(): boolean {
  return Boolean(getTurnstileSiteKey() && getTurnstileSecretKey());
}
