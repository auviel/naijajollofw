import { NextResponse } from "next/server";
import { requireDiner } from "@/lib/auth/session";
import { changeDinerEmail } from "@/lib/services/diner/account-security";
import { handleApiError } from "@/lib/utils/errors";

export async function POST(request: Request) {
  try {
    const user = await requireDiner();
    const body = await request.json();
    const result = await changeDinerEmail(user.id, body);
    return NextResponse.json({
      data: {
        ...result,
        message: "Email updated. Please verify your new address.",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
