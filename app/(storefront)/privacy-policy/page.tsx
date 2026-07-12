import type { Metadata } from "next";
import Link from "next/link";
import {
  LegalList,
  LegalPageShell,
  LegalSection,
} from "@/components/features/storefront/legal-page-shell";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Naija Jollof Waterloo collects, uses, and protects your personal information.",
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPageShell title="Privacy Policy" lastUpdated="14 July 2025">
      <LegalSection title="Who we are">
        <p>
          Naija Jollof Waterloo is a local Nigerian food service offering online
          ordering, takeout, and delivery in the Kitchener–Waterloo area.
        </p>
        <p>
          Website:{" "}
          <a
            href="https://naijajollofw.ca"
            className="text-foreground underline-offset-2 hover:underline"
            rel="noopener noreferrer"
            target="_blank"
          >
            naijajollofw.ca
          </a>
        </p>
        <p>Location: 280 Lester Street #102, Waterloo, ON N2L 0G2</p>
      </LegalSection>

      <LegalSection title="What personal data we collect">
        <p>
          We only collect personal information necessary to serve your orders and
          improve your experience. This includes:
        </p>
        <LegalList
          items={[
            "Name and contact info (when placing orders or contacting us)",
            "Delivery address and order preferences",
            "Phone number (for order updates)",
            "Email (if you opt into updates)",
            "Payment information (securely handled by third-party processors such as Square)",
          ]}
        />
      </LegalSection>

      <LegalSection title="How we use your data">
        <p>We use your information to:</p>
        <LegalList
          items={[
            "Fulfill and deliver your orders",
            "Respond to your questions",
            "Send you order confirmations or important updates",
            "Occasionally share promotions (only if you opt in)",
          ]}
        />
        <p>
          We do <strong className="font-semibold text-foreground">not</strong>{" "}
          sell your data. Ever.
        </p>
      </LegalSection>

      <LegalSection title="Cookies">
        <p>Our site uses basic cookies to:</p>
        <LegalList
          items={[
            "Keep items in your cart",
            "Save your login if you have an account",
            "Improve website speed and experience",
          ]}
        />
        <p>
          We may also store a copy of your guest cart ID in your browser’s local
          storage so your cart can be restored if Safari clears cookies after a
          period of inactivity. You can clear cookies and site data in your
          browser settings anytime.
        </p>
      </LegalSection>

      <LegalSection title="Embedded content">
        <p>
          Some pages may include content (like maps) from external sources such
          as Google. These services may collect data just as if you visited their
          site directly.
        </p>
      </LegalSection>

      <LegalSection title="Who we share your data with">
        <p>We may share your info with:</p>
        <LegalList
          items={[
            "Delivery partners (for example Uber, DoorDash, or restaurant staff for manual delivery)",
            "Payment processors (for example Square)",
            "Website hosting providers",
          ]}
        />
        <p>
          Only as needed to process orders or keep the website running.
        </p>
      </LegalSection>

      <LegalSection title="How long we retain your data">
        <LegalList
          items={[
            "Order info is stored for audit and legal purposes (usually up to 7 years)",
            "Account data (if created) is stored until you delete it",
            "Cookies last up to 30 days unless you clear them",
          ]}
        />
      </LegalSection>

      <LegalSection title="Your rights">
        <p>You can:</p>
        <LegalList
          items={[
            "Request a copy of the personal data we store",
            "Ask us to delete your account or data",
            "Opt out of any promotional emails anytime",
          ]}
        />
        <p>
          Contact us by phone at{" "}
          <a
            href="tel:+15198851517"
            className="text-foreground underline-offset-2 hover:underline"
          >
            (519) 885-1517
          </a>{" "}
          or via WhatsApp.
        </p>
      </LegalSection>

      <LegalSection title="Questions?">
        <p>
          You can contact us anytime by phone or WhatsApp for questions about
          your data or privacy. See also our{" "}
          <Link
            href="/terms-and-conditions"
            className="text-foreground underline-offset-2 hover:underline"
          >
            Terms and Conditions
          </Link>
          .
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
