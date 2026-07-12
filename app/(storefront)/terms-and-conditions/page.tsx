import type { Metadata } from "next";
import Link from "next/link";
import {
  LegalList,
  LegalPageShell,
  LegalSection,
} from "@/components/features/storefront/legal-page-shell";

export const metadata: Metadata = {
  title: "Terms and Conditions",
  description:
    "Terms and conditions for ordering from Naija Jollof Waterloo online.",
};

export default function TermsAndConditionsPage() {
  return (
    <LegalPageShell
      title="Terms and Conditions"
      lastUpdated="14 July 2025"
    >
      <LegalSection title="Overview">
        <p>
          These Terms &amp; Conditions govern your use of this website and the
          services we offer, including online ordering, delivery, pickup, and
          account management. By using our site, you agree to these terms. If
          you do not agree, please do not use the site.
        </p>
      </LegalSection>

      <LegalSection title="Ordering & payment">
        <LegalList
          items={[
            "Orders placed through this website are subject to availability.",
            "We reserve the right to cancel any order if an item is out of stock or due to pricing errors.",
            "Payments are processed securely via third-party payment providers (such as Square). We do not store your full payment details.",
            "All prices are listed in CAD and include applicable taxes unless otherwise stated.",
          ]}
        />
      </LegalSection>

      <LegalSection title="Delivery & pickup">
        <LegalList
          items={[
            "Delivery times are estimates and may vary based on location, weather, and order volume.",
            "We may fulfill delivery via restaurant staff or third-party platforms (for example Uber or DoorDash).",
            "Customers are responsible for providing accurate delivery information.",
          ]}
        />
      </LegalSection>

      <LegalSection title="Cancellations & refunds">
        <LegalList
          items={[
            "Orders cannot be changed or canceled once confirmed unless there is an issue caused by us (for example an unavailable item).",
            <>
              Due to the nature of food service,{" "}
              <strong className="font-semibold text-foreground">
                all sales are final
              </strong>
              . We do not offer refunds or exchanges unless your order was
              incorrect or not delivered.
            </>,
          ]}
        />
      </LegalSection>

      <LegalSection title="Account use">
        <LegalList
          items={[
            "If you create an account, you are responsible for maintaining the confidentiality of your login info.",
            "We reserve the right to suspend or delete accounts that violate our terms, abuse the service, or engage in fraudulent activity.",
          ]}
        />
      </LegalSection>

      <LegalSection title="Content & media">
        <LegalList
          items={[
            "All photos, logos, and content on this site are owned by Naija Jollof Waterloo unless stated otherwise.",
            "You may not reproduce or distribute any part of this website without written permission.",
          ]}
        />
      </LegalSection>

      <LegalSection title="Privacy">
        <p>
          Your data is handled in accordance with our{" "}
          <Link
            href="/privacy-policy"
            className="text-foreground underline-offset-2 hover:underline"
          >
            Privacy Policy
          </Link>
          . By using this site, you consent to our data practices.
        </p>
      </LegalSection>

      <LegalSection title="Third-party services">
        <p>
          We are not responsible for issues caused by third-party services used
          in conjunction with this website (for example payment processors,
          delivery platforms, or embedded content).
        </p>
      </LegalSection>

      <LegalSection title="Changes to terms">
        <p>
          We may update these Terms at any time. Continued use of the site after
          changes are posted constitutes your acceptance of those changes.
        </p>
      </LegalSection>

      <LegalSection title="Contact us">
        <p>
          For questions about these Terms, contact us by phone at{" "}
          <a
            href="tel:+15198851517"
            className="text-foreground underline-offset-2 hover:underline"
          >
            (519) 885-1517
          </a>{" "}
          or via WhatsApp.
        </p>
        <p className="text-sm">
          Address: 280 Lester St #102, Waterloo, ON N2L 0G2
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
