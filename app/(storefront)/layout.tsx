import { StorefrontFooter } from "@/components/features/storefront/storefront-footer";
import { StorefrontFooterGate } from "@/components/features/storefront/storefront-footer-gate";
import { StorefrontHeader } from "@/components/features/storefront/storefront-header";
import { StorefrontMain } from "@/components/features/storefront/storefront-main";
import { StorefrontAiChat } from "@/components/features/ai/storefront-ai-chat";
import { StorefrontSiteJsonLd } from "@/components/seo/storefront-site-json-ld";
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
      <StorefrontSiteJsonLd />
      <div
        id="storefront-scroll"
        className={`${outfit.variable} flex min-h-dvh flex-1 flex-col bg-surface`}
      >
        <StorefrontHeader />
        <StorefrontMain>{children}</StorefrontMain>
        <Suspense fallback={null}>
          <StorefrontFooterGate>
            <StorefrontFooter />
          </StorefrontFooterGate>
        </Suspense>
        <StorefrontAiChat />
      </div>
    </StorefrontProviders>
  );
}
