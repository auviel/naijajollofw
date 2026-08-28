import { dayOfWeekLabel, type StoreHoursSchedule } from "@/lib/domain/store/hours";
import type { MenuItemDetail } from "@/lib/domain/menu/types";
import type { StoreProfile } from "@/lib/domain/store/types";
import type { PublicGoogleRating } from "@/lib/integrations/google/places/types";
import type { StorefrontFaqEntry } from "@/lib/seo/storefront-faq";
import { absoluteUrl, getSiteUrl } from "@/lib/seo/site";

const INSTAGRAM_URL = "https://www.instagram.com/naijajollof_waterloo/";

type JsonLdObject = Record<string, unknown>;

export type { JsonLdObject };

export function organizationId(): string {
  return `${getSiteUrl()}/#organization`;
}

export function websiteId(): string {
  return `${getSiteUrl()}/#website`;
}

export function restaurantId(): string {
  return `${getSiteUrl()}/#restaurant`;
}

export function jsonLdGraph(...nodes: JsonLdObject[]): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@graph": nodes,
  };
}

function postalAddress(store: StoreProfile): JsonLdObject {
  const line2 = store.addressLine2 ? `, ${store.addressLine2}` : "";
  return {
    "@type": "PostalAddress",
    streetAddress: `${store.addressLine1}${line2}`,
    addressLocality: store.city,
    addressRegion: store.province,
    postalCode: store.postalCode,
    addressCountry: store.country || "CA",
  };
}

export function openingHoursSpecifications(
  schedule: StoreHoursSchedule,
): JsonLdObject[] {
  if (!schedule.configured) return [];

  return schedule.days
    .filter((day) => !day.closed && day.openTime && day.closeTime)
    .map((day) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: dayOfWeekLabel(day.dayOfWeek),
      opens: day.openTime,
      closes: day.closeTime,
    }));
}

export function buildOrganizationJsonLd(store: StoreProfile): JsonLdObject {
  return {
    "@type": "Organization",
    "@id": organizationId(),
    name: store.name,
    url: getSiteUrl(),
    email: store.email,
    telephone: store.phone,
    logo: {
      "@type": "ImageObject",
      url: absoluteUrl("/brand/icon-512.png"),
    },
    sameAs: [INSTAGRAM_URL],
    address: postalAddress(store),
  };
}

export function buildWebSiteJsonLd(): JsonLdObject {
  return {
    "@type": "WebSite",
    "@id": websiteId(),
    url: getSiteUrl(),
    name: "Naija Jollof Waterloo",
    description:
      "Order smoky jollof, rich stews, and party trays from Naija Jollof Waterloo. Pickup or delivery.",
    publisher: { "@id": organizationId() },
    inLanguage: "en-CA",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${getSiteUrl()}/?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function buildRestaurantJsonLd(input: {
  store: StoreProfile;
  schedule: StoreHoursSchedule;
  googleRating?: PublicGoogleRating | null;
}): JsonLdObject {
  const { store, schedule, googleRating } = input;
  const hours = openingHoursSpecifications(schedule);

  return {
    "@type": "Restaurant",
    "@id": restaurantId(),
    name: store.name,
    url: getSiteUrl(),
    telephone: store.phone,
    email: store.email,
    image: absoluteUrl("/brand/naija-jollof-hero.png"),
    address: postalAddress(store),
    geo: {
      "@type": "GeoCoordinates",
      latitude: store.latitude,
      longitude: store.longitude,
    },
    servesCuisine: "Nigerian",
    priceRange: "$$",
    menu: absoluteUrl("/menu.json"),
    acceptsReservations: false,
    parentOrganization: { "@id": organizationId() },
    ...(googleRating
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: googleRating.rating.toFixed(1),
            reviewCount: googleRating.reviewCount,
            bestRating: "5",
            worstRating: "1",
          },
        }
      : {}),
    ...(hours.length > 0 ? { openingHoursSpecification: hours } : {}),
  };
}

export function buildFaqPageJsonLd(entries: StorefrontFaqEntry[]): JsonLdObject {
  return {
    "@type": "FAQPage",
    mainEntity: entries.map((entry) => ({
      "@type": "Question",
      name: entry.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: entry.answer,
      },
    })),
  };
}

export function buildProductJsonLd(input: {
  store: StoreProfile;
  item: MenuItemDetail;
}): JsonLdObject {
  const { store, item } = input;
  const image = item.images[0]?.url ?? item.imageUrl;
  const description =
    item.description?.trim() ||
    `Order ${item.name} from ${store.name}. Pickup or delivery.`;

  return {
    "@type": "Product",
    "@id": absoluteUrl(`/item/${item.slug}#product`),
    name: item.name,
    description,
    sku: item.id,
    category: item.categoryName,
    ...(image ? { image: absoluteUrl(image) } : {}),
    brand: {
      "@type": "Brand",
      name: store.name,
    },
    offers: {
      "@type": "Offer",
      url: absoluteUrl(`/item/${item.slug}`),
      priceCurrency: "CAD",
      price: (item.priceCents / 100).toFixed(2),
      availability: item.available
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      seller: { "@id": organizationId() },
      offeredBy: { "@id": restaurantId() },
    },
  };
}

export function buildBreadcrumbJsonLd(
  items: { name: string; path: string }[],
): JsonLdObject {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function buildBlogPostingJsonLd(input: {
  title: string;
  description: string;
  slug: string;
  publishedAt: string;
  imageUrl?: string | null;
}): JsonLdObject {
  const publisher = {
    "@type": "Organization",
    "@id": organizationId(),
    name: "Naija Jollof Waterloo",
    url: getSiteUrl(),
    logo: {
      "@type": "ImageObject",
      url: absoluteUrl("/brand/icon-512.png"),
    },
  };

  return {
    "@type": "BlogPosting",
    headline: input.title,
    description: input.description,
    datePublished: input.publishedAt,
    dateModified: input.publishedAt,
    author: publisher,
    publisher,
    mainEntityOfPage: absoluteUrl(`/blog/${input.slug}`),
    isPartOf: { "@id": `${absoluteUrl("/blog")}#blog` },
    ...(input.imageUrl ? { image: input.imageUrl } : {}),
  };
}

export function buildBlogIndexJsonLd(
  posts: { title: string; slug: string; publishedAt: string }[],
): JsonLdObject {
  return {
    "@type": "Blog",
    "@id": `${absoluteUrl("/blog")}#blog`,
    url: absoluteUrl("/blog"),
    name: "Naija Jollof Blog",
    description:
      "Recipes, kitchen stories, and Waterloo updates from Naija Jollof.",
    publisher: { "@id": organizationId() },
    inLanguage: "en-CA",
    blogPost: posts.slice(0, 12).map((post) => ({
      "@type": "BlogPosting",
      headline: post.title,
      datePublished: post.publishedAt,
      url: absoluteUrl(`/blog/${post.slug}`),
    })),
  };
}
