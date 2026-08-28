import { BlogPostCardImmersive } from "@/components/features/blog/blog-post-card-immersive";
import type { BlogPostListItem } from "@/lib/sanity/types";

type BlogRelatedProps = {
  posts: BlogPostListItem[];
};

export function BlogRelated({ posts }: BlogRelatedProps) {
  if (posts.length === 0) return null;

  return (
    <section className="mt-16 border-t border-border pt-12">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground">
          Related articles
        </h2>
        <p className="text-sm text-text-secondary">
          {posts.length} article{posts.length === 1 ? "" : "s"}
        </p>
      </div>
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => (
          <BlogPostCardImmersive key={post._id} post={post} />
        ))}
      </div>
    </section>
  );
}
