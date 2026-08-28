export type SanityImage = {
  asset?: { _ref?: string; _id?: string; url?: string };
  alt?: string;
} | null;

export type BlogPostListItem = {
  _id: string;
  title: string;
  slug: string;
  publishedAt: string;
  mainImage: SanityImage;
  excerpt: string;
};

export type BlogPostDetail = BlogPostListItem & {
  body: unknown[];
  seo: {
    metaTitle?: string | null;
    metaDescription?: string | null;
    ogImage?: SanityImage;
  } | null;
};
