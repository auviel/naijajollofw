import Link from "next/link";
import { SearchX, Users } from "@/components/ui/icons";
import type { CustomerListItem } from "@/lib/domain/customer/types";
import { EmptyState } from "@/components/ui/empty-state";
import { PrimaryLink } from "@/components/layout/page-header";
import { truncateText } from "@/lib/utils/date";

type CustomerListEmptyProps = {
  hasSearch?: boolean;
};

function plural(count: number, singular: string, pluralLabel = `${singular}s`) {
  return `${count} ${count === 1 ? singular : pluralLabel}`;
}

export function CustomerListEmpty({ hasSearch = false }: CustomerListEmptyProps) {
  if (hasSearch) {
    return (
      <EmptyState
        className="flex-1"
        icon={<SearchX className="h-6 w-6" aria-hidden />}
        title="No customers found"
        description="Try a different search."
      />
    );
  }

  return (
    <EmptyState
      className="flex-1"
      icon={<Users className="h-6 w-6" aria-hidden />}
      title="No customers yet"
      description="They’re saved when you send a delivery, or add one now."
      action={<PrimaryLink href="/dashboard/customers/new">New customer</PrimaryLink>}
    />
  );
}

type CustomerListProps = {
  items: CustomerListItem[];
};

export function CustomerList({ items }: CustomerListProps) {
  return (
    <div className="space-y-2">
      {items.map((customer) => (
        <CustomerListRow key={customer.id} customer={customer} />
      ))}
    </div>
  );
}

function CustomerListRow({ customer }: { customer: CustomerListItem }) {
  const meta = [
    plural(customer.orderCount, "order"),
    customer.phoneCount > 1 ? plural(customer.phoneCount, "phone") : null,
    customer.addressCount > 1 ? plural(customer.addressCount, "address", "addresses") : null,
  ].filter(Boolean);

  return (
    <Link
      href={`/dashboard/customers/${customer.id}`}
      className="block rounded-2xl bg-surface-elevated px-4 py-3 transition-colors duration-fast hover:bg-surface sm:px-4 sm:py-3.5"
    >
      <p className="font-medium text-foreground">{customer.name}</p>
      {customer.primaryPhone ? (
        <p className="mt-0.5 text-sm text-text-secondary">{customer.primaryPhone}</p>
      ) : null}
      {customer.primaryAddress ? (
        <p className="mt-0.5 text-sm text-text-secondary">
          {truncateText(customer.primaryAddress, 72)}
        </p>
      ) : null}
      {meta.length > 0 ? (
        <p className="mt-2 text-xs text-text-tertiary">{meta.join(" · ")}</p>
      ) : null}
    </Link>
  );
}
