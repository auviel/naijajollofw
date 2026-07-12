import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { AuthSessionProvider } from "@/components/providers/session-provider";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Naija Jollof Waterloo",
    template: "%s · Naija Jollof Waterloo",
  },
  description:
    "Order smoky jollof, rich stews, and party trays from Naija Jollof Waterloo. Pickup or delivery.",
  applicationName: "Naija Jollof Waterloo",
  appleWebApp: {
    title: "Naija Jollof",
  },
};

/** viewport-fit=cover so env(safe-area-inset-*) is non-zero on notched iPhones. */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-CA" className={`${inter.variable} min-h-dvh`}>
      <body>
        <AuthSessionProvider>
          <div className="flex min-h-dvh flex-1 flex-col">{children}</div>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
