import { NextResponse } from "next/server";
import {
  deleteDinerAddress,
  updateDinerAddress,
} from "@/lib/services/diner/addresses";
import { handleApiError } from "@/lib/utils/errors";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const address = await updateDinerAddress(id, body);
    return NextResponse.json({ data: address });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const result = await deleteDinerAddress(id);
    return NextResponse.json({ data: result });
  } catch (error) {
    return handleApiError(error);
  }
}
