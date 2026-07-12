import { NextResponse } from "next/server";
import {
  createDinerAddress,
  listDinerAddresses,
} from "@/lib/services/diner/addresses";
import { handleApiError } from "@/lib/utils/errors";

export async function GET() {
  try {
    const addresses = await listDinerAddresses();
    return NextResponse.json({ data: addresses });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const address = await createDinerAddress(body);
    return NextResponse.json({ data: address }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
