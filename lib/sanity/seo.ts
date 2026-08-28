export function plainTextFromPortableText(blocks: unknown): string {
  if (!Array.isArray(blocks)) return "";
  return blocks
    .filter(
      (b): b is { _type: string; children?: { text?: string }[] } =>
        Boolean(
          b &&
            typeof b === "object" &&
            (b as { _type?: string })._type === "block",
        ),
    )
    .map((b) => (b.children ?? []).map((c) => c.text ?? "").join(""))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

export function defaultMetaTitle(title: string, max = 60): string {
  const t = title.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trimEnd()}…`;
}

export function defaultMetaDescription(plainBody: string, max = 155): string {
  const t = plainBody.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trimEnd()}…`;
}
