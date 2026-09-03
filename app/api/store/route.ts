import { requireStoreManager } from "@/lib/auth/session";
import { updateStoreProfile } from "@/lib/services/store/update-store-profile";
import {
  STORE_UPDATE_LIMIT,
  STORE_UPDATE_WINDOW_MS,
  assertDurableRateLimit,
} from "@/lib/services/auth/login-protection";
import { parseJsonBody } from "@/lib/utils/api-request";
import { handleApiError } from "@/lib/utils/errors";
import { updateStoreProfileSchema } from "@/lib/domain/store/validation";
import { getRequestIpFromRequest } from "@/lib/utils/request-ip";

export async function PATCH(request: Request) {
  try {
    const user = await requireStoreManager();

    await assertDurableRateLimit({
      kind: "store-update",
      ip: getRequestIpFromRequest(request),
      subject: user.id,
      limit: STORE_UPDATE_LIMIT,
      windowMs: STORE_UPDATE_WINDOW_MS,
    });

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
