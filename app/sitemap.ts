import type { MetadataRoute } from "next";
import { client } from "@/lib/sanity/client";
import { isSanityConfigured } from "@/lib/sanity/env";
import { POST_SITEMAP_QUERY } from "@/lib/sanity/queries";
import { absoluteUrl } from "@/lib/seo/site";
import { getPublicStorefront } from "@/lib/services/storefront/get-public-menu";

type BlogSitemapEntry = {
  slug: string;
  publishedAt: string;
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl("/"),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: absoluteUrl("/hours"),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: absoluteUrl("/chat"),
      changeFrequency: "monthly",
      priority: 0.75,
    },
    {
      url: absoluteUrl("/blog"),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: absoluteUrl("/privacy-policy"),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: absoluteUrl("/terms-and-conditions"),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  const { catalog } = await getPublicStorefront();
  const itemPages: MetadataRoute.Sitemap = catalog.categories.flatMap(
    (category) =>
      category.items
        .filter((item) => item.available)
        .map((item) => ({
          url: absoluteUrl(`/item/${item.slug}`),
          changeFrequency: "weekly" as const,
          priority: 0.7,
        })),
  );

  let blogPages: MetadataRoute.Sitemap = [];
  if (isSanityConfigured()) {
    const entries = await client.fetch<BlogSitemapEntry[]>(POST_SITEMAP_QUERY);
    blogPages = entries.map((entry) => ({
      url: absoluteUrl(`/blog/${entry.slug}`),
      lastModified: entry.publishedAt,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }));
  }

  return [...staticPages, ...itemPages, ...blogPages];
}
