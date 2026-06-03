import Link from "next/link";
import { ChevronRight, Package, SearchX } from "lucide-react";
import type { DeliveryListItem } from "@/lib/domain/delivery/types";
import type { DeliveryListFilter } from "@/lib/domain/delivery/filters";
import { DeliveryStatusBadge } from "@/components/features/deliveries/delivery-status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PrimaryLink } from "@/components/layout/page-header";
import { formatCadFromCents } from "@/lib/utils/currency";
import { formatDateTime, truncateText } from "@/lib/utils/date";

type DeliveryListEmptyProps = {
  hasSearch?: boolean;
  filter?: DeliveryListFilter;
};

export function DeliveryListEmpty({
  hasSearch = false,
  filter = "all",
}: DeliveryListEmptyProps) {
  if (hasSearch || filter !== "all") {
    return (
      <EmptyState
        className="flex-1"
        icon={<SearchX className="h-6 w-6" aria-hidden />}
        title="No deliveries found"
        description="Try a different search term or filter to find what you're looking for."
      />
    );
  }

  return (
    <EmptyState
      className="flex-1"
      icon={<Package className="h-6 w-6" aria-hidden />}
      title="No deliveries yet"
      description="Create your first delivery to dispatch an Uber Direct courier from your store."
      action={<PrimaryLink href="/dashboard/deliveries/new">New delivery</PrimaryLink>}
    />
  );
}

type DeliveryListProps = {
  items: DeliveryListItem[];
};

export function DeliveryList({ items }: DeliveryListProps) {
  return (
    <div className="space-y-3">
      {items.map((delivery) => (
        <DeliveryListRow key={delivery.id} delivery={delivery} />
      ))}
    </div>
  );
}

function DeliveryListRow({ delivery }: { delivery: DeliveryListItem }) {
  const fee =
    delivery.feeCents !== null ? formatCadFromCents(delivery.feeCents) : "—";

  return (
    <Link
      href={`/dashboard/deliveries/${delivery.id}`}
      className="group block rounded-lg border border-border bg-surface-elevated p-4 transition-colors duration-fast hover:bg-surface"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-foreground">{delivery.dropoffName}</p>
            <span className="max-w-full truncate font-mono text-xs text-text-tertiary">
              {delivery.externalId}
            </span>
          </div>
          <p className="mt-1 text-sm text-text-secondary">
            {truncateText(delivery.dropoffAddress, 72)}
          </p>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-tertiary">
            <span>Created {formatDateTime(delivery.createdAt)}</span>
            {delivery.scheduledFor ? (
              <span>Scheduled {formatDateTime(delivery.scheduledFor)}</span>
            ) : null}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 sm:shrink-0 sm:flex-col sm:items-end">
          <div className="text-left sm:text-right">
            <DeliveryStatusBadge status={delivery.status} />
            <p className="mt-2 text-sm font-semibold tabular-nums text-foreground">
              {fee}
            </p>
          </div>
          <ChevronRight className="hidden h-5 w-5 text-text-tertiary transition-transform duration-fast group-hover:translate-x-0.5 sm:block" />
        </div>
      </div>
    </Link>
  );
}
