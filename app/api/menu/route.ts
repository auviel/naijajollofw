import { NextResponse } from "next/server";
import { requireStoreManager } from "@/lib/auth/session";
import { listMenuCatalog } from "@/lib/services/menu/list-menu";
import { handleApiError } from "@/lib/utils/errors";

export async function GET() {
  try {
    await requireStoreManager();
    const catalog = await listMenuCatalog();
    return NextResponse.json({ data: catalog });
  } catch (error) {
    return handleApiError(error);
  }
}
