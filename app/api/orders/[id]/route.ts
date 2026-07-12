import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { getPublicOrder } from "@/lib/services/order/get-public-order";
import { getStaffOrder } from "@/lib/services/order/get-staff-order";
import { AppError, handleApiError } from "@/lib/utils/errors";

const paramsSchema = z.object({
  id: z.string().cuid(),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = paramsSchema.parse(await context.params);
    const token = new URL(request.url).searchParams.get("token");

    if (token) {
      const order = await getPublicOrder(id, token);
      return NextResponse.json({ data: order });
    }

    const user = await getSessionUser();
    if (!user) {
      throw new AppError(
        "UNAUTHORIZED",
        "Authentication or order token required.",
        401,
      );
    }

    const order = await getStaffOrder(id);
    return NextResponse.json({ data: order });
  } catch (error) {
    return handleApiError(error);
  }
}
