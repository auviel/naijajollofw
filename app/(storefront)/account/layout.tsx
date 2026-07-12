import { AccountNav } from "@/components/features/account/account-nav";
import { requireDiner } from "@/lib/auth/session";

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireDiner();

  return (
    <div className="mx-auto w-full max-w-5xl py-6 sm:py-10">
      <div className="flex flex-col gap-8 md:flex-row md:items-start md:gap-10 lg:gap-14">
        <AccountNav userName={user.name} />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
