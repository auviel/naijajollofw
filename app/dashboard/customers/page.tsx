import { Suspense } from "react";
import {
  DashboardPage,
  DashboardPageBody,
  PageHeader,
  PrimaryLink,
} from "../layout";
import { CustomerList } from "@/components/features/customers/customer-list";
import { CustomerListEmpty } from "@/components/features/customers/customer-list";
import { CustomerListFilters } from "@/components/features/customers/customer-list-filters";
import { listCustomers } from "@/lib/services/customer/list-customers";

type CustomersPageProps = {
  searchParams: Promise<{ q?: string }>;
};

export default async function CustomersPage({ searchParams }: CustomersPageProps) {
  const params = await searchParams;
  const { items, search } = await listCustomers({ search: params.q });

  return (
    <DashboardPage>
      <PageHeader
        title="Customers"
        action={<PrimaryLink href="/dashboard/customers/new">New customer</PrimaryLink>}
      />

      <Suspense fallback={null}>
        <CustomerListFilters search={search} />
      </Suspense>

      <DashboardPageBody>
        {items.length === 0 ? (
          <CustomerListEmpty hasSearch={Boolean(search)} />
        ) : (
          <CustomerList items={items} />
        )}
      </DashboardPageBody>
    </DashboardPage>
  );
}
