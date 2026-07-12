import { NextResponse } from "next/server";
import { removeDinerCard } from "@/lib/services/diner/payment-methods";
import { handleApiError } from "@/lib/utils/errors";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const result = await removeDinerCard(id);
    return NextResponse.json({ data: result });
  } catch (error) {
    return handleApiError(error);
  }
}
