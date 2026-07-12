import { NextResponse } from "next/server";
import {
  addDinerCard,
  getDinerPaymentState,
} from "@/lib/services/diner/payment-methods";
import { handleApiError } from "@/lib/utils/errors";

export async function GET() {
  try {
    const state = await getDinerPaymentState();
    return NextResponse.json({ data: state });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const card = await addDinerCard(body);
    return NextResponse.json({ data: card }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
