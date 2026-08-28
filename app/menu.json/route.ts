import { buildPublicMenuFeed } from "@/lib/seo/menu-feed";
import { getPublicStorefront } from "@/lib/services/storefront/get-public-menu";

export const revalidate = 300;

export async function GET() {
  const { store, catalog } = await getPublicStorefront();
  const body = buildPublicMenuFeed({ store, catalog });

  return Response.json(body, {
    headers: {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
