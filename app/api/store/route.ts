import { requireStoreManager } from "@/lib/auth/session";
import { updateStoreProfile } from "@/lib/services/store/update-store-profile";
import { parseJsonBody } from "@/lib/utils/api-request";
import { handleApiError, AppError } from "@/lib/utils/errors";
import { checkRateLimit } from "@/lib/utils/rate-limit";
import { updateStoreProfileSchema } from "@/lib/domain/store/validation";

const STORE_UPDATE_RATE_LIMIT = 10;
const STORE_UPDATE_RATE_WINDOW_MS = 60_000;

export async function PATCH(request: Request) {
  try {
    const user = await requireStoreManager();

    const rateLimit = checkRateLimit(
      `store-update:${user.id}`,
      STORE_UPDATE_RATE_LIMIT,
      STORE_UPDATE_RATE_WINDOW_MS,
    );

    if (!rateLimit.allowed) {
      throw new AppError(
        "VALIDATION_ERROR",
        `Too many store updates. Try again in ${rateLimit.retryAfterSeconds}s.`,
        429,
      );
    }

    const body = await parseJsonBody(request, updateStoreProfileSchema);
    const store = await updateStoreProfile({
      storeId: user.storeId,
      body,
    });

    return Response.json({ data: store });
  } catch (error) {
    return handleApiError(error);
  }
}
