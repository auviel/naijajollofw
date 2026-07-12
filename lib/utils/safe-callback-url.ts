/**
 * Restrict post-login redirects to same-origin relative paths.
 * Blocks open redirects like `//evil.com` and `https://evil.com`.
 */
export function safeCallbackUrl(
  raw: string | null | undefined,
  fallback: string,
): string {
  if (!raw) {
    return fallback;
  }

  const value = raw.trim();
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return fallback;
  }

  // Reject scheme-ish or userinfo tricks in the path.
  if (
    value.includes("://") ||
    value.includes("\\") ||
    value.includes("@") ||
    value.includes("%2f%2f") ||
    value.includes("%2F%2F")
  ) {
    return fallback;
  }

  return value;
}
