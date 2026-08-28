import { describe, expect, it } from "vitest";
import type { StoreHoursSchedule } from "@/lib/domain/store/hours";
import type { StoreProfile } from "@/lib/domain/store/types";
import {
  buildFaqPageJsonLd,
  buildOrganizationJsonLd,
  buildProductJsonLd,
  buildRestaurantJsonLd,
  buildWebSiteJsonLd,
  jsonLdGraph,
  organizationId,
  openingHoursSpecifications,
} from "@/lib/seo/json-ld";
import { buildLlmsTxt } from "@/lib/seo/llms";
import { buildPublicMenuFeed } from "@/lib/seo/menu-feed";
import { privatePageMetadata } from "@/lib/seo/noindex";
import { buildStorefrontFaqEntries } from "@/lib/seo/storefront-faq";
import { getSiteUrl } from "@/lib/seo/site";

const store: StoreProfile = {
  id: "store-1",
  name: "Naija Jollof Waterloo",
  phone: "+15198851517",
  email: "hello@naijajollofw.ca",
  addressLine1: "280 Lester St",
  addressLine2: "#102",
  city: "Waterloo",
  province: "ON",
  postalCode: "N2L 3W5",
  country: "CA",
  latitude: 43.4723,
  longitude: -80.5449,
  enabledUberDirect: true,
  enabledDoorDashDrive: false,
};

const schedule: StoreHoursSchedule = {
  timezone: "America/Toronto",
  configured: true,
  days: [
    {
      dayOfWeek: 1,
      closed: false,
      openTime: "11:00",
      closeTime: "22:00",
    },
  ],
};

describe("privatePageMetadata", () => {
  it("marks pages as noindex", () => {
    expect(privatePageMetadata({ title: "Cart" }).robots).toMatchObject({
      index: false,
      follow: false,
    });
  });
});

describe("json-ld builders", () => {
  it("builds restaurant schema with hours", () => {
    const json = buildRestaurantJsonLd({ store, schedule });
    expect(json).toMatchObject({
      "@type": "Restaurant",
      name: store.name,
      telephone: store.phone,
      servesCuisine: "Nigerian",
    });
    expect(openingHoursSpecifications(schedule)).toHaveLength(1);
  });

  it("builds FAQ schema from shared entries", () => {
    const entries = buildStorefrontFaqEntries({
      store,
      prepMinutes: 25,
      todayLabel: "11:00 – 22:00",
    });
    const json = buildFaqPageJsonLd(entries);
    expect(json.mainEntity).toHaveLength(entries.length);
  });

  it("builds product offers in CAD", () => {
    const json = buildProductJsonLd({
      store,
      item: {
        id: "item-1",
        slug: "jollof-rice",
        storeId: store.id,
        categoryId: "cat-1",
        categoryName: "Mains",
        additionalCategoryIds: [],
        name: "Jollof Rice",
        description: "Smoky party jollof.",
        priceCents: 1599,
        imageUrl: "/brand/naija-jollof-hero.png",
        images: [],
        available: true,
        sortOrder: 0,
        modifierGroups: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    expect(json.offers).toMatchObject({
      priceCurrency: "CAD",
      price: "15.99",
      availability: "https://schema.org/InStock",
      seller: { "@id": organizationId() },
    });
  });

  it("builds site-wide organization and website schema", () => {
    const org = buildOrganizationJsonLd(store);
    const site = buildWebSiteJsonLd();
    expect(org).toMatchObject({
      "@type": "Organization",
      sameAs: ["https://www.instagram.com/naijajollof_waterloo/"],
    });
    expect(site.potentialAction).toMatchObject({
      "@type": "SearchAction",
    });
  });

  it("wraps multiple nodes in a graph", () => {
    const graph = jsonLdGraph(
      { "@type": "Restaurant", name: "Test" },
      { "@type": "FAQPage", mainEntity: [] },
    );
    expect(graph["@graph"]).toHaveLength(2);
  });
});

describe("llms.txt", () => {
  it("includes canonical site facts and menu links", () => {
    const text = buildLlmsTxt({
      store,
      schedule,
      catalog: {
        categories: [
          {
            id: "cat-1",
            name: "Mains",
            sortOrder: 0,
            active: true,
            items: [
              {
                id: "item-1",
                slug: "jollof-rice",
                categoryId: "cat-1",
                categoryName: "Mains",
                name: "Jollof Rice",
                description: "Smoky party jollof.",
                priceCents: 1599,
                imageUrl: null,
                available: true,
                sortOrder: 0,
                modifierGroupCount: 0,
                imageCount: 0,
              },
            ],
          },
        ],
      },
    });

    expect(text).toContain(getSiteUrl());
    expect(text).toContain("Jollof Rice");
    expect(text).toContain("/item/jollof-rice");
    expect(text).toContain("/sitemap.xml");
    expect(text).toContain("/menu.json");
  });
});

describe("menu feed", () => {
  it("exports structured menu data for agents", () => {
    const feed = buildPublicMenuFeed({
      store,
      catalog: {
        categories: [
          {
            id: "cat-1",
            name: "Mains",
            sortOrder: 0,
            active: true,
            items: [
              {
                id: "item-1",
                slug: "jollof-rice",
                categoryId: "cat-1",
                categoryName: "Mains",
                name: "Jollof Rice",
                description: "Smoky party jollof.",
                priceCents: 1599,
                imageUrl: null,
                available: true,
                sortOrder: 0,
                modifierGroupCount: 0,
                imageCount: 0,
              },
            ],
          },
        ],
      },
    });

    expect(feed.categories[0]?.items[0]).toMatchObject({
      slug: "jollof-rice",
      priceCad: "15.99",
    });
  });
});
