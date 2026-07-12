import type { OrderStatus } from "@prisma/client";
import { STAFF_ORDER_STATUS_LABELS } from "@/lib/domain/order/types";
import { cn } from "@/lib/utils/cn";

const STATUS_CONFIG: Record<OrderStatus, string> = {
  pending_payment: "bg-gray-100 text-gray-600",
  pending_acceptance: "bg-amber-50 text-amber-900",
  accepted: "bg-blue-50 text-blue-800",
  preparing: "bg-indigo-50 text-indigo-800",
  ready: "bg-green-50 text-green-800",
  ready_for_pickup: "bg-green-100 text-green-900",
  out_for_delivery: "bg-blue-50 text-blue-700",
  completed: "bg-gray-100 text-gray-600",
  cancelled: "bg-red-50 text-red-700",
};

type OrderStatusBadgeProps = {
  status: OrderStatus;
  className?: string;
};

export function OrderStatusBadge({ status, className }: OrderStatusBadgeProps) {
  const label = STAFF_ORDER_STATUS_LABELS[status];

  return (
    <span
      role="status"
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
        STATUS_CONFIG[status],
        className,
      )}
      aria-label={`Order status: ${label}`}
    >
      {label}
    </span>
  );
}
