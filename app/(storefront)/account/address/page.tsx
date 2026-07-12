import type { Metadata } from "next";
import { AccountAddressesClient } from "@/components/features/account/account-addresses-client";
import { listDinerAddresses } from "@/lib/services/diner/addresses";

export const metadata: Metadata = {
  title: "Address",
  description: "Manage saved delivery addresses.",
};

export default async function AccountAddressPage() {
  const addresses = await listDinerAddresses();

  return (
    <section className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
          Address
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          Save delivery addresses for faster checkout.
        </p>
      </div>
      <AccountAddressesClient initialAddresses={addresses} />
    </section>
  );
}
