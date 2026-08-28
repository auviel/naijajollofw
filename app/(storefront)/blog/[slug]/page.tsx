import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { JsonLdScript } from "@/components/seo/json-ld-script";
import { BlogArticleHeader } from "@/components/features/blog/blog-article-header";
import { BlogOrderCta } from "@/components/features/blog/blog-order-cta";
import { BlogPortableText } from "@/components/features/blog/blog-portable-text";
import { BlogRelated } from "@/components/features/blog/blog-related";
import { BlogShare } from "@/components/features/blog/blog-share";
import { isSanityConfigured } from "@/lib/sanity/env";
import { sanityImageUrl, sanityOgImageUrl } from "@/lib/sanity/image";
import { sanityFetch } from "@/lib/sanity/live";
import {
  POST_BY_SLUG_QUERY,
  RELATED_POSTS_QUERY,
} from "@/lib/sanity/queries";
import {
  defaultMetaDescription,
  defaultMetaTitle,
  plainTextFromPortableText,
} from "@/lib/sanity/seo";
import type { BlogPostDetail, BlogPostListItem } from "@/lib/sanity/types";
import { buildBlogPostingJsonLd } from "@/lib/seo/json-ld";
import { buildShareMetadata } from "@/lib/seo/share-metadata";

type BlogArticlePageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: BlogArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  if (!isSanityConfigured() || !sanityFetch) {
    return { title: "Blog" };
  }

  const { data } = await sanityFetch({
    query: POST_BY_SLUG_QUERY,
    params: { slug },
  });
  const post = data as BlogPostDetail | null;
  if (!post) return { title: "Blog" };

  const title =
    post.seo?.metaTitle?.trim() || defaultMetaTitle(post.title);
  const description =
    post.seo?.metaDescription?.trim() ||
    defaultMetaDescription(
      plainTextFromPortableText(post.body) || post.excerpt || "",
    );
  const ogImage = sanityOgImageUrl(post.seo?.ogImage ?? post.mainImage);

  return buildShareMetadata({
    title,
    description,
    imageUrl: ogImage,
    imageAlt: post.mainImage?.alt || post.title,
    type: "article",
    publishedTime: post.publishedAt,
    path: `/blog/${slug}`,
  });
}

export default async function BlogArticlePage({
  params,
}: BlogArticlePageProps) {
  const { slug } = await params;

  if (!isSanityConfigured() || !sanityFetch) {
    notFound();
  }

  const [{ data: postData }, { data: relatedData }] = await Promise.all([
    sanityFetch({
      query: POST_BY_SLUG_QUERY,
      params: { slug },
    }),
    sanityFetch({
      query: RELATED_POSTS_QUERY,
      params: { slug, limit: 3 },
    }),
  ]);

  const post = postData as BlogPostDetail | null;
  if (!post) notFound();

  const related = (relatedData as BlogPostListItem[] | null) ?? [];
  const cover = sanityImageUrl(post.mainImage, 1400);
  const title = post.seo?.metaTitle?.trim() || defaultMetaTitle(post.title);
  const description =
    post.seo?.metaDescription?.trim() ||
    defaultMetaDescription(
      plainTextFromPortableText(post.body) || post.excerpt || "",
    );
  const ogImage = sanityOgImageUrl(post.seo?.ogImage ?? post.mainImage);

  return (
    <>
      <JsonLdScript
        data={buildBlogPostingJsonLd({
          title,
          description,
          slug,
          publishedAt: post.publishedAt,
          imageUrl: ogImage,
        })}
      />
      <article className="py-2 sm:py-4">
      <BlogArticleHeader title={post.title} publishedAt={post.publishedAt} />

      {cover ? (
        <div className="relative mx-auto mt-8 aspect-[16/9] max-w-4xl overflow-hidden rounded-2xl bg-surface sm:mt-10">
          <Image
            src={cover}
            alt={post.mainImage?.alt || post.title}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 896px"
            className="object-cover"
          />
        </div>
      ) : null}

      <div className="mt-10">
        <BlogPortableText value={post.body ?? []} />
      </div>

      <BlogShare title={post.title} />
      <BlogOrderCta />
      <BlogRelated posts={related} />
    </article>
    </>
  );
}
