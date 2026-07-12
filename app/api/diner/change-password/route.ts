import { NextResponse } from "next/server";
import { changeDinerPassword } from "@/lib/services/diner/change-password";
import { handleApiError } from "@/lib/utils/errors";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    await changeDinerPassword(body);
    return NextResponse.json({
      data: {
        ok: true,
        message: "Password updated. Sign in again on other devices.",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
