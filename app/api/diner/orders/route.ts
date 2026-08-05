import { listDinerOrders } from "@/lib/services/diner/list-orders";
import { handleApiError } from "@/lib/utils/errors";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const data = await listDinerOrders();
    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error);
  }
}
