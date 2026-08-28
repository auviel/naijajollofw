import { buildLlmsTxt } from "@/lib/seo/llms";
import { getPublicStoreHoursSchedule } from "@/lib/services/store/store-hours";
import { getPublicStorefront } from "@/lib/services/storefront/get-public-menu";

export const revalidate = 300;

export async function GET() {
  const [{ store, catalog }, schedule] = await Promise.all([
    getPublicStorefront(),
    getPublicStoreHoursSchedule(),
  ]);

  const body = buildLlmsTxt({ store, schedule, catalog });

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
