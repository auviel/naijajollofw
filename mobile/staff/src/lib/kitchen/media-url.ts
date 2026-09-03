import { API_URL } from "@/lib/config";

/** Turn API-relative media paths into absolute URLs for React Native Image. */
export function resolveMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("/")) return `${API_URL}${trimmed}`;
  return trimmed;
}
