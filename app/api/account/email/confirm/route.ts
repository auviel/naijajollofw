import { confirmStaffEmailChange } from "@/lib/services/staff/account";
import {
  STAFF_EMAIL_CONFIRM_LIMIT,
  STAFF_EMAIL_CONFIRM_WINDOW_MS,
  assertDurableRateLimit,
} from "@/lib/services/auth/login-protection";
import { parseJsonBody } from "@/lib/utils/api-request";
import { handleApiError } from "@/lib/utils/errors";
import { requireStoreManager } from "@/lib/auth/session";
import { staffEmailConfirmSchema } from "@/lib/domain/account/validation-staff";
import { getRequestIpFromRequest } from "@/lib/utils/request-ip";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const user = await requireStoreManager();
    await assertDurableRateLimit({
      kind: "staff-email-confirm",
      ip: getRequestIpFromRequest(request),
      subject: user.id,
      limit: STAFF_EMAIL_CONFIRM_LIMIT,
      windowMs: STAFF_EMAIL_CONFIRM_WINDOW_MS,
    });

    const body = await parseJsonBody(request, staffEmailConfirmSchema);
    const data = await confirmStaffEmailChange(body);
    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error);
  }
}
