import { getDinerMe } from "@/lib/services/diner/get-me";
import { handleApiError } from "@/lib/utils/errors";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const data = await getDinerMe();
    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error);
  }
}
