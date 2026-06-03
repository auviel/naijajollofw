import Link from "next/link";
import { ChevronRight, SearchX, Users } from "lucide-react";
import type { CustomerListItem } from "@/lib/domain/customer/types";
import { EmptyState } from "@/components/ui/empty-state";
import { PrimaryLink } from "@/components/layout/page-header";
import { formatDateTime, truncateText } from "@/lib/utils/date";

type CustomerListEmptyProps = {
  hasSearch?: boolean;
};

export function CustomerListEmpty({ hasSearch = false }: CustomerListEmptyProps) {
  if (hasSearch) {
    return (
      <EmptyState
        className="flex-1"
        icon={<SearchX className="h-6 w-6" aria-hidden />}
        title="No customers found"
        description="Try a different search term."
      />
    );
  }

  return (
    <EmptyState
      className="flex-1"
      icon={<Users className="h-6 w-6" aria-hidden />}
      title="No saved customers yet"
      description="Customers are saved automatically when you send a delivery."
      action={<PrimaryLink href="/dashboard/customers/new">New customer</PrimaryLink>}
    />
  );
}

type CustomerListProps = {
  items: CustomerListItem[];
};

export function CustomerList({ items }: CustomerListProps) {
  return (
    <div className="space-y-3">
      {items.map((customer) => (
        <CustomerListRow key={customer.id} customer={customer} />
      ))}
    </div>
  );
}

function CustomerListRow({ customer }: { customer: CustomerListItem }) {
  return (
    <Link
      href={`/dashboard/customers/${customer.id}`}
      className="group block rounded-lg border border-border bg-surface-elevated p-4 transition-colors duration-fast hover:bg-surface"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground">{customer.name}</p>
          {customer.primaryPhone ? (
            <p className="mt-1 text-sm text-text-secondary">{customer.primaryPhone}</p>
          ) : null}
          {customer.primaryAddress ? (
            <p className="mt-1 text-sm text-text-secondary">
              {truncateText(customer.primaryAddress, 72)}
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-tertiary">
            <span>{customer.deliveryCount} deliveries</span>
            {customer.phoneCount > 1 ? (
              <span>{customer.phoneCount} phones</span>
            ) : null}
            {customer.addressCount > 1 ? (
              <span>{customer.addressCount} addresses</span>
            ) : null}
            <span>Updated {formatDateTime(customer.updatedAt)}</span>
          </div>
        </div>
        <ChevronRight className="hidden h-5 w-5 shrink-0 text-text-tertiary transition-transform duration-fast group-hover:translate-x-0.5 sm:block" />
      </div>
    </Link>
  );
}
