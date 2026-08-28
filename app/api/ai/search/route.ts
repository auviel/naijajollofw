import { aiSearchCatalog } from "@/lib/ai/catalog/ai-search-catalog";
import { shouldUseAiSearch } from "@/lib/ai/catalog/should-use-ai-search";
import { createRestaurantCatalogPort } from "@/lib/ai/verticals/restaurant/ports";
import { checkRateLimit } from "@/lib/utils/rate-limit";
import { getRequestIpFromRequest } from "@/lib/utils/request-ip";

export const maxDuration = 20;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const query = url.searchParams.get("q")?.trim() ?? "";

  if (!query) {
    return Response.json({ items: [], ai: false, queries: [] });
  }

  const ip = getRequestIpFromRequest(req);
  const limited = checkRateLimit(`ai-search:${ip}`, 30, 60_000);
  if (!limited.allowed) {
    return Response.json(
      { error: "Too many searches. Try again shortly.", items: [], ai: false },
      {
        status: 429,
        headers: {
          "Retry-After": String(limited.retryAfterSeconds ?? 60),
        },
      },
    );
  }

  const limit = Math.min(
    Math.max(Number(url.searchParams.get("limit") ?? 24), 1),
    48,
  );

  if (!shouldUseAiSearch(query)) {
    const catalog = createRestaurantCatalogPort();
    const items = await catalog.search(query, limit);
    return Response.json({ items, ai: false, queries: [query] });
  }

  const { items, queries } = await aiSearchCatalog(query, limit);
  return Response.json({ items, ai: true, queries });
}
