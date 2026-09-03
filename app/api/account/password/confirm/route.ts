import { confirmStaffPasswordChange } from "@/lib/services/staff/account";
import {
  STAFF_PASSWORD_CONFIRM_LIMIT,
  STAFF_PASSWORD_CONFIRM_WINDOW_MS,
  assertDurableRateLimit,
} from "@/lib/services/auth/login-protection";
import { parseJsonBody } from "@/lib/utils/api-request";
import { handleApiError } from "@/lib/utils/errors";
import { requireStoreManager } from "@/lib/auth/session";
import { staffPasswordConfirmSchema } from "@/lib/domain/account/validation-staff";
import { getRequestIpFromRequest } from "@/lib/utils/request-ip";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const user = await requireStoreManager();
    await assertDurableRateLimit({
      kind: "staff-password-confirm",
      ip: getRequestIpFromRequest(request),
      subject: user.id,
      limit: STAFF_PASSWORD_CONFIRM_LIMIT,
      windowMs: STAFF_PASSWORD_CONFIRM_WINDOW_MS,
    });

    const body = await parseJsonBody(request, staffPasswordConfirmSchema);
    await confirmStaffPasswordChange(body);
    return NextResponse.json({ data: { ok: true } });
  } catch (error) {
    return handleApiError(error);
  }
}
