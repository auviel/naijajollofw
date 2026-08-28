/** Turn a menu item name into a URL path segment. */
export function slugifyMenuItemName(name: string): string {
  const slug = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");

  return slug || "item";
}

/**
 * Pick a unique slug for a store. Tries `base`, then `base-2`, `base-3`, …
 * `taken` should return true when the candidate already exists (excluding the
 * item being updated).
 */
export async function allocateUniqueMenuSlug(
  name: string,
  taken: (candidate: string) => Promise<boolean>,
): Promise<string> {
  const base = slugifyMenuItemName(name);
  if (!(await taken(base))) {
    return base;
  }

  for (let n = 2; n < 10_000; n++) {
    const candidate = `${base}-${n}`;
    if (!(await taken(candidate))) {
      return candidate;
    }
  }

  throw new Error(`Could not allocate a unique slug for "${name}"`);
}
