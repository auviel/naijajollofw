import type { Metadata } from "next";

/** Metadata for authenticated, transactional, or staff-only pages. */
export function privatePageMetadata(input: {
  title: string;
  description?: string;
}): Metadata {
  return {
    title: input.title,
    description: input.description,
    robots: {
      index: false,
      follow: false,
      googleBot: { index: false, follow: false },
    },
  };
}
