/** Use AI search on submit for natural-language queries — not per keystroke. */
export function shouldUseAiSearch(query: string): boolean {
  const trimmed = query.trim();
  if (trimmed.length < 3) return false;

  if (/\s/.test(trimmed)) return true;

  return /^(what|any|something|show|find|recommend|craving|hungry|looking|need|want|got|have)\b/i.test(
    trimmed,
  );
}
