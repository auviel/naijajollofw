import { OrderStatusClient } from "@/components/features/storefront/order-status-client";
import { getPublicOrder } from "@/lib/services/order/get-public-order";
import { isAppError } from "@/lib/utils/errors";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
};

export default async function OrderStatusPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { token = "" } = await searchParams;

  let initialOrder = null;
  let initialError: string | null = null;

  try {
    initialOrder = await getPublicOrder(id, token);
  } catch (error) {
    initialError = isAppError(error)
      ? error.message
      : "Unable to load this order.";
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <OrderStatusClient
        orderId={id}
        token={token}
        initialOrder={initialOrder}
        initialError={initialError}
      />
    </div>
  );
}
