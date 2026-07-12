import { NextResponse } from "next/server";
import { registerDiner } from "@/lib/services/diner/register";
import { handleApiError } from "@/lib/utils/errors";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const diner = await registerDiner(body);
    return NextResponse.json({ data: diner }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
