import { NextResponse } from "next/server";
import { registerDiner } from "@/lib/services/diner/register";
import { handleApiError } from "@/lib/utils/errors";

function clientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || null;
  }
  return request.headers.get("x-real-ip");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const diner = await registerDiner(body, { remoteIp: clientIp(request) });
    return NextResponse.json({ data: diner }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
