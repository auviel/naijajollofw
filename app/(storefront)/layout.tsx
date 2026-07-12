import { StorefrontFooter } from "@/components/features/storefront/storefront-footer";
import { StorefrontFooterGate } from "@/components/features/storefront/storefront-footer-gate";
import { StorefrontHeader } from "@/components/features/storefront/storefront-header";
import { MotionPageShell } from "@/components/motion/motion-page-shell";
import { StorefrontProviders } from "@/components/providers/storefront-providers";
import { Outfit } from "next/font/google";
import { Suspense } from "react";

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
        className={`${outfit.variable} flex min-h-dvh flex-1 flex-col bg-background`}
      >
        <StorefrontHeader />
        <main
          id="main-content"
          className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))] sm:px-6 sm:py-8 md:pb-8 lg:px-8"
        >
          <MotionPageShell>{children}</MotionPageShell>
        </main>
        <Suspense fallback={null}>
          <StorefrontFooterGate>
            <StorefrontFooter />
          </StorefrontFooterGate>
        </Suspense>
      </div>
    </StorefrontProviders>
  );
}
