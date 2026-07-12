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
    capable: true,
    title: "Naija Jollof",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/brand/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/brand/apple-touch-icon.png", sizes: "180x180" }],
  },
};

/**
 * viewport-fit=cover → env(safe-area-inset-*) works for iOS home indicator
 * and Android Chrome gesture/nav bars. interactiveWidget keeps focused
 * fields visible above the Android keyboard.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
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
