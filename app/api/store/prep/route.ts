import { NextResponse } from "next/server";
import { requireStoreManager } from "@/lib/auth/session";
import { updatePrepMinutesSchema } from "@/lib/domain/store/prep-validation";
import {
  getStorePrepMinutes,
  updateStorePrepMinutes,
} from "@/lib/services/store/update-prep-minutes";
import { parseJsonBody } from "@/lib/utils/api-request";
import { handleApiError } from "@/lib/utils/errors";

export async function GET() {
  try {
    await requireStoreManager();
    const data = await getStorePrepMinutes();
    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    await requireStoreManager();
    const body = await parseJsonBody(request, updatePrepMinutesSchema);
    const data = await updateStorePrepMinutes(body);
    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error);
  }
}
