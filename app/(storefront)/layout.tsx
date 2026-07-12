import { StorefrontHeader } from "@/components/features/storefront/storefront-header";
import { StorefrontProviders } from "@/components/providers/storefront-providers";
import { Outfit } from "next/font/google";

const outfit = Outfit({
  variable: "--font-storefront-display",
  subsets: ["latin"],
  display: "swap",
});

export default function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <StorefrontProviders>
      <div
        id="storefront-scroll"
        className={`${outfit.variable} flex min-h-full flex-1 flex-col overflow-y-auto bg-background`}
      >
        <StorefrontHeader />
        <main id="main-content" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          {children}
        </main>
      </div>
    </StorefrontProviders>
  );
}
