/**
 * Canonical public site origin for absolute URLs (OG, emails, etc.).
 */
export function getSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  return "https://naijajollofw.ca";
}

/** Default share image when a page has no specific photo. */
export const DEFAULT_SHARE_IMAGE_PATH = "/brand/naija-jollof-hero.png";

export function absoluteUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const path = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${getSiteUrl()}${path}`;
}
