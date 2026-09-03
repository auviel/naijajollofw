import { getSessionContext } from "@/lib/auth/session";
import { updateStaffProfile } from "@/lib/services/staff/account";
import {
  STAFF_ME_PATCH_LIMIT,
  STAFF_ME_PATCH_WINDOW_MS,
  assertDurableRateLimit,
} from "@/lib/services/auth/login-protection";
import { parseJsonBody } from "@/lib/utils/api-request";
import { AppError, handleApiError } from "@/lib/utils/errors";
import { updateStaffProfileSchema } from "@/lib/domain/account/validation-staff";
import { getRequestIpFromRequest } from "@/lib/utils/request-ip";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const context = await getSessionContext();

    if (!context) {
      return NextResponse.json(
        { error: "Authentication required", code: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    return NextResponse.json({
      data: {
        user: {
          id: context.user.id,
          name: context.user.name,
          email: context.user.email,
          phoneE164: context.user.phoneE164 ?? null,
          role: context.user.role,
          storeId: context.user.storeId,
          storeName: context.user.storeName,
        },
        store: context.store,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const context = await getSessionContext();
    if (!context) {
      throw new AppError("UNAUTHORIZED", "Authentication required", 401);
    }

    await assertDurableRateLimit({
      kind: "staff-me-patch",
      ip: getRequestIpFromRequest(request),
      subject: context.user.id,
      limit: STAFF_ME_PATCH_LIMIT,
      windowMs: STAFF_ME_PATCH_WINDOW_MS,
    });

    const body = await parseJsonBody(request, updateStaffProfileSchema);
    const result = await updateStaffProfile(body);

    return NextResponse.json({ data: result });
  } catch (error) {
    return handleApiError(error);
  }
}
