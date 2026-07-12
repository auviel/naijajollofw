import { NextResponse } from "next/server";
import { getPublicStoreOpenStatus } from "@/lib/services/store/store-hours";
import { handleApiError } from "@/lib/utils/errors";

/** Public open/closed status for the storefront. */
export async function GET() {
  try {
    const data = await getPublicStoreOpenStatus();
    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error);
  }
}
