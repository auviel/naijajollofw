import Link from "next/link";

export function BlogOrderCta() {
  return (
    <aside className="relative mx-auto mt-14 max-w-2xl overflow-hidden rounded-2xl border border-border bg-surface-elevated px-6 py-10 text-center shadow-[0_1px_0_rgba(0,0,0,0.03)] sm:px-10 sm:py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,var(--accent-subtle),transparent_55%),radial-gradient(ellipse_at_100%_100%,rgba(204,84,0,0.06),transparent_45%)]"
      />
      <div className="relative">
        <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem]">
          Ready to eat?
        </h2>
        <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-text-secondary">
          Order party jollof, sides, and the rest of the menu for pickup or
          delivery in Waterloo.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/#menu"
            className="inline-flex h-11 items-center justify-center rounded-md bg-accent px-5 text-sm font-semibold text-text-inverse no-underline transition-colors hover:bg-accent-hover"
          >
            Order now
          </Link>
          <Link
            href="/blog"
            className="inline-flex h-11 items-center justify-center rounded-md border border-border bg-background px-4 text-sm font-medium text-foreground no-underline transition-colors hover:bg-surface"
          >
            More articles
          </Link>
        </div>
      </div>
    </aside>
  );
}
