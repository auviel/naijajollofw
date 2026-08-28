import Link from "next/link";
import { BlogCoverImage } from "@/components/features/blog/blog-cover-image";
import { BlogPostCardStacked } from "@/components/features/blog/blog-post-card-stacked";
import { sanityImageUrl } from "@/lib/sanity/image";
import type { BlogPostListItem } from "@/lib/sanity/types";

function formatBlogDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

type BlogPostCardImmersiveProps = {
  post: BlogPostListItem;
};

export function BlogPostCardImmersive({ post }: BlogPostCardImmersiveProps) {
  const src = sanityImageUrl(post.mainImage, 900);
  if (!src) {
    return <BlogPostCardStacked post={post} />;
  }

  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group relative block aspect-[4/5] overflow-hidden rounded-2xl no-underline sm:aspect-[16/11]"
    >
      <BlogCoverImage
        src={src}
        alt={post.mainImage?.alt || post.title}
        className="transition-transform duration-normal ease-out group-hover:scale-[1.02]"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent"
      />
      <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
        <h3 className="font-display text-lg font-semibold tracking-tight text-white line-clamp-2 sm:text-xl">
          {post.title}
        </h3>
        <time
          dateTime={post.publishedAt}
          className="mt-2 block text-sm text-white/80"
        >
          {formatBlogDate(post.publishedAt)}
        </time>
      </div>
    </Link>
  );
}
