import { getDelivery } from "@/lib/services/delivery/get-delivery";
import { handleApiError } from "@/lib/utils/errors";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const delivery = await getDelivery(id);

    return Response.json({ data: delivery });
  } catch (error) {
    return handleApiError(error);
  }
}
