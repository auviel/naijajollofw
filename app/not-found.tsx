import { StorefrontFooter } from "@/components/features/storefront/storefront-footer";
import { StorefrontHeader } from "@/components/features/storefront/storefront-header";
import { NotFoundPanel } from "@/components/layout/not-found-panel";
import { StorefrontProviders } from "@/components/providers/storefront-providers";
import { Outfit } from "next/font/google";

const outfit = Outfit({
  variable: "--font-storefront-display",
  subsets: ["latin"],
  display: "swap",
});

/** Unknown URLs outside matched route groups — use storefront chrome. */
export default function RootNotFound() {
  return (
    <StorefrontProviders>
      <div
        className={`${outfit.variable} flex min-h-dvh flex-1 flex-col bg-surface`}
      >
        <StorefrontHeader />
        <main
          id="main-content"
          className="mx-auto flex w-full max-w-7xl flex-1 items-center justify-center px-4 py-6 sm:px-6 sm:py-8 lg:px-8"
        >
          <NotFoundPanel
            title="Page not found"
            description="We couldn't find that page. Try the menu or go home."
            primaryAction={{ href: "/", label: "Browse menu" }}
            secondaryAction={{ href: "/hours", label: "Store hours" }}
          />
        </main>
        <StorefrontFooter />
      </div>
    </StorefrontProviders>
  );
}
