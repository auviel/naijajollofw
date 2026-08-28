import type { Metadata } from "next";
import Link from "next/link";
import { BlogIndexHero } from "@/components/features/blog/blog-index-hero";
import { BlogPagination } from "@/components/features/blog/blog-pagination";
import { BlogPostCardStacked } from "@/components/features/blog/blog-post-card-stacked";
import { isSanityConfigured } from "@/lib/sanity/env";
import { sanityFetch } from "@/lib/sanity/live";
import { POSTS_PAGE_QUERY } from "@/lib/sanity/queries";
import type { BlogPostListItem } from "@/lib/sanity/types";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Recipes, kitchen stories, and Waterloo updates from Naija Jollof.",
};

const PAGE_SIZE = 9;

type BlogIndexPageProps = {
  searchParams: Promise<{ page?: string }>;
};

export default async function BlogIndexPage({
  searchParams,
}: BlogIndexPageProps) {
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);

  if (!isSanityConfigured() || !sanityFetch) {
    return (
      <section className="mx-auto max-w-2xl py-6 sm:py-8">
        <BlogIndexHero />
        <p className="mt-8 text-center text-[15px] leading-relaxed text-text-secondary">
          Stories are on the way. Check back soon.
        </p>
        <div className="mt-6 text-center">
          <Link
            href="/#menu"
            className="text-sm font-medium text-accent no-underline hover:opacity-80"
          >
            Browse the menu
          </Link>
        </div>
      </section>
    );
  }

  const start = (page - 1) * PAGE_SIZE;
  const end = start + PAGE_SIZE;

  const { data } = await sanityFetch({
    query: POSTS_PAGE_QUERY,
    params: { start, end },
  });

  const pageData = data as
    | { total?: number; posts?: BlogPostListItem[] }
    | null
    | undefined;
  const total = pageData?.total ?? 0;
  const posts = pageData?.posts ?? [];
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <section className="py-2 sm:py-4">
      <BlogIndexHero />

      <div className="mt-10 flex items-baseline justify-between gap-4">
        <h2 className="font-display text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          All articles
        </h2>
        <p className="text-sm text-text-secondary">
          {total} article{total === 1 ? "" : "s"}
        </p>
      </div>

      {posts.length === 0 ? (
        <div className="mt-10 text-center">
          <p className="text-[15px] text-text-secondary">
            No articles published yet.
          </p>
          <Link
            href="/#menu"
            className="mt-4 inline-flex text-sm font-medium text-accent no-underline hover:opacity-80"
          >
            Browse the menu
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <BlogPostCardStacked key={post._id} post={post} />
          ))}
        </div>
      )}

      <BlogPagination page={page} totalPages={totalPages} />
    </section>
  );
}
