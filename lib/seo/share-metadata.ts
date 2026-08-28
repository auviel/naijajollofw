import type { Metadata } from "next";
import {
  DEFAULT_SHARE_IMAGE_PATH,
  absoluteUrl,
  getSiteUrl,
} from "@/lib/seo/site";

export type ShareImageInput = {
  url: string;
  alt?: string;
  width?: number;
  height?: number;
};

/**
 * Build Open Graph + Twitter metadata with a concrete share image when
 * available, otherwise the site default hero.
 */
export function buildShareMetadata(input: {
  title: string;
  description: string;
  /** Absolute or site-relative image URL. Omit to use the default hero. */
  imageUrl?: string | null;
  imageAlt?: string;
  type?: "website" | "article";
  publishedTime?: string;
  path?: string;
}): Metadata {
  const imageUrl = absoluteUrl(input.imageUrl?.trim() || DEFAULT_SHARE_IMAGE_PATH);
  const image: ShareImageInput = {
    url: imageUrl,
    alt: input.imageAlt?.trim() || input.title,
    width: 1200,
    height: 630,
  };

  const url = input.path ? absoluteUrl(input.path) : undefined;

  return {
    title: input.title,
    description: input.description,
    alternates: url ? { canonical: url } : undefined,
    openGraph: {
      title: input.title,
      description: input.description,
      type: input.type ?? "website",
      url,
      siteName: "Naija Jollof Waterloo",
      locale: "en_CA",
      publishedTime: input.publishedTime,
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description: input.description,
      images: [image.url],
    },
  };
}

export function siteMetadataBase(): URL {
  return new URL(`${getSiteUrl()}/`);
}
