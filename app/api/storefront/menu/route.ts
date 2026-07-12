import { NextResponse } from "next/server";
import { getPublicStorefront } from "@/lib/services/storefront/get-public-menu";
import { handleApiError } from "@/lib/utils/errors";

export async function GET() {
  try {
    const data = await getPublicStorefront();
    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error);
  }
}
