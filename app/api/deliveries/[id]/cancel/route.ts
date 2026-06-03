import { cancelDelivery } from "@/lib/services/delivery/cancel-delivery";
import { handleApiError } from "@/lib/utils/errors";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const delivery = await cancelDelivery(id, body);

    return Response.json({ data: delivery });
  } catch (error) {
    return handleApiError(error);
  }
}
