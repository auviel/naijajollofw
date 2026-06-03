import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AuthSessionProvider } from "@/components/providers/session-provider";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "deliverGO",
  description: "Store delivery dispatch powered by Uber Direct",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-CA" className={`${inter.variable} h-full min-h-dvh`}>
      <body>
        <AuthSessionProvider>
          <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
