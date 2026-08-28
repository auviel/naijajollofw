import { getR2Config } from "@/lib/integrations/r2/config";
import { tryParseR2ObjectKeyFromPublicUrl } from "@/lib/integrations/r2/keys";

function configuredPublicBaseUrl(): string | null {
  const base = process.env.R2_PUBLIC_BASE_URL?.trim()?.replace(/\/+$/, "");
  return base || null;
}

/** Build the public CDN/r2.dev URL for an object key. */
export function publicUrlForObjectKey(key: string): string {
  const { publicBaseUrl } = getR2Config();
  const normalizedKey = key.replace(/^\/+/, "");
  return `${publicBaseUrl}/${normalizedKey}`;
}

function tryParseStoresObjectKeyFromUrl(url: string): string | null {
  try {
    const key = new URL(url).pathname.replace(/^\/+/, "");
    if (!key.startsWith("stores/") || key.includes("..")) {
      return null;
    }
    return key;
  } catch {
    return null;
  }
}

/**
 * Rewrite legacy r2.dev (or other old base) URLs to the current R2_PUBLIC_BASE_URL.
 * Leaves local `/brand/...` paths and already-correct URLs unchanged.
 */
export function normalizePublicMediaUrl(
  url: string | null | undefined,
): string | null {
  if (!url) {
    return null;
  }

  const trimmed = url.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith("/")) {
    return trimmed;
  }

  const publicBaseUrl = configuredPublicBaseUrl();
  if (!publicBaseUrl) {
    return trimmed;
  }

  if (trimmed.startsWith(`${publicBaseUrl}/`)) {
    return trimmed;
  }

  const key =
    tryParseR2ObjectKeyFromPublicUrl(trimmed, publicBaseUrl) ??
    tryParseStoresObjectKeyFromUrl(trimmed);

  if (key) {
    return `${publicBaseUrl}/${key.replace(/^\/+/, "")}`;
  }

  return trimmed;
}
