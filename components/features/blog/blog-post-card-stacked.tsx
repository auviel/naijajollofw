import Link from "next/link";
import { BlogCoverImage } from "@/components/features/blog/blog-cover-image";
import { sanityImageUrl } from "@/lib/sanity/image";
import type { BlogPostListItem } from "@/lib/sanity/types";

function formatBlogDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

type BlogPostCardStackedProps = {
  post: BlogPostListItem;
};

export function BlogPostCardStacked({ post }: BlogPostCardStackedProps) {
  const src = sanityImageUrl(post.mainImage, 900);

  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group flex flex-col no-underline text-foreground"
    >
      <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-surface">
        <BlogCoverImage src={src} alt={post.mainImage?.alt || post.title} />
      </div>
      <h3 className="mt-4 font-display text-lg font-semibold tracking-tight text-foreground line-clamp-2 group-hover:underline group-hover:underline-offset-4">
        {post.title}
      </h3>
      <time
        dateTime={post.publishedAt}
        className="mt-2 text-sm text-text-secondary"
      >
        {formatBlogDate(post.publishedAt)}
      </time>
    </Link>
  );
}
