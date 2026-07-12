import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Stories, recipes, and updates from Naija Jollof Waterloo — coming soon.",
};

export default function BlogIndexPage() {
  return (
    <section className="mx-auto max-w-2xl py-10 sm:py-14">
      <p className="text-sm text-text-tertiary">
        <Link
          href="/"
          className="text-text-secondary no-underline transition-colors hover:text-foreground"
        >
          Home
        </Link>
        <span aria-hidden className="mx-2">
          /
        </span>
        <span>Blog</span>
      </p>

      <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
        Blog
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-text-secondary">
        Recipes, kitchen stories, and Waterloo updates are on the way. Check
        back soon.
      </p>
      <Link
        href="/#menu"
        className="mt-8 inline-flex text-sm font-medium text-accent no-underline transition-opacity hover:opacity-80"
      >
        Browse the menu
      </Link>
    </section>
  );
}
