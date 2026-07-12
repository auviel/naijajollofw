import { NextResponse } from "next/server";
import { getPublicMenuItem } from "@/lib/services/storefront/get-public-menu";
import { handleApiError } from "@/lib/utils/errors";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const data = await getPublicMenuItem(id);
    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error);
  }
}
