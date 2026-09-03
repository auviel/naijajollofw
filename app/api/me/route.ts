import { getSessionContext } from "@/lib/auth/session";
import {
  confirmStaffEmailChange,
  updateStaffProfile,
} from "@/lib/services/staff/account";
import { parseJsonBody } from "@/lib/utils/api-request";
import { AppError, handleApiError } from "@/lib/utils/errors";
import { checkRateLimit } from "@/lib/utils/rate-limit";
import { updateStaffProfileSchema } from "@/lib/domain/account/validation-staff";
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

    const rateLimit = checkRateLimit(`staff-me-patch:${context.user.id}`, 20, 60_000);
    if (!rateLimit.allowed) {
      throw new AppError(
        "VALIDATION_ERROR",
        `Too many updates. Try again in ${rateLimit.retryAfterSeconds}s.`,
        429,
      );
    }

    const body = await parseJsonBody(request, updateStaffProfileSchema);
    const result = await updateStaffProfile(body);

    return NextResponse.json({ data: result });
  } catch (error) {
    return handleApiError(error);
  }
}
