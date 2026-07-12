import { getOptionalSessionUser } from "@/lib/auth/session";
import { geocodeRequestSchema } from "@/lib/domain/address/validation";
import { geocodeAddress } from "@/lib/services/geocoding/geocode-address";
import { resolvePublicStoreId } from "@/lib/services/storefront/resolve-public-store";
import { parseJsonBody } from "@/lib/utils/api-request";
import { handleApiError, AppError } from "@/lib/utils/errors";
import { checkRateLimit } from "@/lib/utils/rate-limit";
import { getRequestClientKey } from "@/lib/utils/request-client";

const GEOCODE_RATE_LIMIT = 30;
const GEOCODE_RATE_WINDOW_MS = 60_000;

export async function POST(request: Request) {
  try {
    const session = await getOptionalSessionUser();
    const storeId =
      session?.role === "STORE_MANAGER" && session.storeId
        ? session.storeId
        : await resolvePublicStoreId();

    const rateKey =
      session?.role === "STORE_MANAGER"
        ? `geocode:${session.id}`
        : `geocode:public:${getRequestClientKey(request)}`;

    const rateLimit = checkRateLimit(
      rateKey,
      GEOCODE_RATE_LIMIT,
      GEOCODE_RATE_WINDOW_MS,
    );

    if (!rateLimit.allowed) {
      throw new AppError(
        "VALIDATION_ERROR",
        `Too many geocode requests. Try again in ${rateLimit.retryAfterSeconds}s.`,
        429,
      );
    }

    const body = await parseJsonBody(request, geocodeRequestSchema);
    const result = await geocodeAddress({
      query: body.query,
      storeId,
    });

    return Response.json({ data: result });
  } catch (error) {
    return handleApiError(error);
  }
}
