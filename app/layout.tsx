import "./globals.css";

import type { ReactNode } from "react";
import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";

import AppShell from "@/components/app-shell";
import { AppToaster } from "@/src/components/ui/Toast";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});
const grotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-grotesk",
  display: "swap",
});

type RootLayoutProps = {
  children: ReactNode;
};

const defaultSiteUrl = "http://localhost:3000";
const siteUrl = process.env.NEXTAUTH_URL || defaultSiteUrl;
const metadataBase = (() => {
  try {
    return new URL(siteUrl);
  } catch {
    return new URL(defaultSiteUrl);
  }
})();

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" className={`${inter.variable} ${grotesk.variable}`}>
      <body>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-white"
        >
          Skip to main content
        </a>
        <AppShell>{children}</AppShell>
        <AppToaster />
      </body>
    </html>
  );
}

export const metadata: Metadata = {
  title: "Data Vista",
  description:
    "Real-time business insights from your data. Ask any question in plain English — get instant answers, forecasts, and trends. No SQL, no analyst needed.",
  metadataBase,
  openGraph: {
    title: "Data Vista",
    description:
      "Real-time business insights from your data. Ask any question in plain English — get instant answers, forecasts, and trends. No SQL, no analyst needed.",
    url: siteUrl,
    siteName: "Data Vista",
    images: [{ url: "/og.svg", width: 1200, height: 630, alt: "Data Vista" }],
    locale: "en_US",
    type: "website",
  },
  icons: {
    icon: "/logo.png",
  },
};
