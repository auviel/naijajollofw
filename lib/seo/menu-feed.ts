import type { MenuCatalog } from "@/lib/domain/menu/types";
import type { StoreProfile } from "@/lib/domain/store/types";
import { absoluteUrl, getSiteUrl } from "@/lib/seo/site";

export type PublicMenuFeed = {
  store: {
    name: string;
    url: string;
    phone: string;
    email: string;
    address: string;
  };
  updatedAt: string;
  categories: {
    name: string;
    items: {
      name: string;
      slug: string;
      description: string | null;
      priceCad: string;
      url: string;
      available: boolean;
    }[];
  }[];
};

export function buildPublicMenuFeed(input: {
  store: StoreProfile;
  catalog: MenuCatalog;
}): PublicMenuFeed {
  const { store, catalog } = input;
  const line2 = store.addressLine2 ? `, ${store.addressLine2}` : "";

  return {
    store: {
      name: store.name,
      url: getSiteUrl(),
      phone: store.phone,
      email: store.email,
      address: `${store.addressLine1}${line2}, ${store.city}, ${store.province} ${store.postalCode}, ${store.country}`,
    },
    updatedAt: new Date().toISOString(),
    categories: catalog.categories
      .filter((category) => category.active)
      .map((category) => ({
        name: category.name,
        items: category.items.map((item) => ({
          name: item.name,
          slug: item.slug,
          description: item.description,
          priceCad: (item.priceCents / 100).toFixed(2),
          url: absoluteUrl(`/item/${item.slug}`),
          available: item.available,
        })),
      })),
  };
}
