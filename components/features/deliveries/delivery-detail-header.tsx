import Link from "next/link";
import { ArrowLeft } from "@/components/ui/icons";
import { DeliveryStatusBadge } from "@/components/features/deliveries/delivery-status-badge";
import type { DeliveryDetail } from "@/lib/domain/delivery/types";
import { getDeliveryProviderLabel } from "@/lib/domain/delivery/types";
import { formatDateTime } from "@/lib/utils/date";

type DeliveryDetailHeaderProps = {
  delivery: DeliveryDetail;
};

export function DeliveryDetailHeader({ delivery }: DeliveryDetailHeaderProps) {
  return (
    <header className="border-b border-border pb-5 sm:pb-6">
      <Link
        href="/dashboard/orders?channel=courier"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-text-secondary transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Back to courier orders
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            {delivery.dropoff.name}
          </h1>

          <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">
            {delivery.dropoff.address}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-tertiary">
            <span>{getDeliveryProviderLabel(delivery.providerId)}</span>
            <span aria-hidden className="hidden sm:inline">
              ·
            </span>
            <span>Created {formatDateTime(delivery.createdAt)}</span>
          </div>

          {delivery.scheduledFor ? (
            <p className="mt-2 text-sm text-text-secondary">
              Scheduled pickup {formatDateTime(delivery.scheduledFor)}
            </p>
          ) : null}

          {delivery.cancelledAt ? (
            <p className="mt-2 text-sm text-text-secondary">
              Cancelled {formatDateTime(delivery.cancelledAt)}
              {delivery.cancelReason ? ` · ${delivery.cancelReason}` : ""}
            </p>
          ) : null}
        </div>

        <DeliveryStatusBadge status={delivery.status} className="shrink-0" />
      </div>
    </header>
  );
}
