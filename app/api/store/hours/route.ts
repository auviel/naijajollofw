import { NextResponse } from "next/server";
import { requireStoreManager } from "@/lib/auth/session";
import { updateStoreHoursSchema } from "@/lib/domain/store/hours-validation";
import {
  getStaffStoreHours,
  updateStaffStoreHours,
} from "@/lib/services/store/store-hours";
import { parseJsonBody } from "@/lib/utils/api-request";
import { handleApiError } from "@/lib/utils/errors";

export async function GET() {
  try {
    await requireStoreManager();
    const data = await getStaffStoreHours();
    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: Request) {
  try {
    await requireStoreManager();
    const body = await parseJsonBody(request, updateStoreHoursSchema);
    const data = await updateStaffStoreHours(body);
    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error);
  }
}
