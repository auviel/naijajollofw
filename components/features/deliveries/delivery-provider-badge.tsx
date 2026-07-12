import type { DeliveryProviderId } from "@/lib/domain/delivery/types";
import { getDeliveryProviderLabel } from "@/lib/domain/delivery/types";

type DeliveryProviderBadgeProps = {
  providerId: DeliveryProviderId;
  className?: string;
};

export function DeliveryProviderBadge({
  providerId,
  className = "",
}: DeliveryProviderBadgeProps) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full border border-border bg-surface px-2 py-0.5 text-[11px] font-medium text-text-secondary ${className}`}
    >
      {getDeliveryProviderLabel(providerId)}
    </span>
  );
}
