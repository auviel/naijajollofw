import { getOptionalSessionUser } from "@/lib/auth/session";
import { geocodeSuggestRequestSchema } from "@/lib/domain/address/validation";
import { suggestAddresses } from "@/lib/services/geocoding/suggest-addresses";
import { resolvePublicStoreId } from "@/lib/services/storefront/resolve-public-store";
import { parseJsonBody } from "@/lib/utils/api-request";
import { handleApiError, AppError } from "@/lib/utils/errors";
import { checkRateLimit } from "@/lib/utils/rate-limit";
import { getRequestClientKey } from "@/lib/utils/request-client";

const SUGGEST_RATE_LIMIT = 60;
const SUGGEST_RATE_WINDOW_MS = 60_000;

export async function POST(request: Request) {
  try {
    const session = await getOptionalSessionUser();
    const storeId =
      session?.role === "STORE_MANAGER" && session.storeId
        ? session.storeId
        : await resolvePublicStoreId();

    const rateKey =
      session?.role === "STORE_MANAGER"
        ? `geocode-suggest:${session.id}`
        : `geocode-suggest:public:${getRequestClientKey(request)}`;

    const rateLimit = checkRateLimit(
      rateKey,
      SUGGEST_RATE_LIMIT,
      SUGGEST_RATE_WINDOW_MS,
    );

    if (!rateLimit.allowed) {
      throw new AppError(
        "VALIDATION_ERROR",
        `Too many address lookups. Try again in ${rateLimit.retryAfterSeconds}s.`,
        429,
      );
    }

    const body = await parseJsonBody(request, geocodeSuggestRequestSchema);
    const suggestions = await suggestAddresses({
      query: body.query,
      storeId,
    });

    return Response.json({ data: suggestions });
  } catch (error) {
    return handleApiError(error);
  }
}
