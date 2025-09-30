import "./globals.css";

import type { ReactNode } from "react";
import Link from "next/link";
import { Inter, Space_Grotesk } from "next/font/google";

import AuthNav from "@/components/auth-nav";
import NavLink from "@/components/nav-link";
import { AppToaster } from "@/src/components/ui/Toast";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const grotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-grotesk", display: "swap" });

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" className={`${inter.variable} ${grotesk.variable}`}>
      <body>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-[#0B0F12]"
        >
          Skip to main content
        </a>
        <div className="flex min-h-screen flex-col bg-gradient-to-br from-[#181c28] to-[#23263a]">
          <header className="sticky top-0 z-20 border-b border-[#23263a]/60 bg-[#23263a]/80 backdrop-blur-xl shadow-lg">
            <div className="mx-auto flex max-w-5xl items-center gap-6 px-6 py-4">
              <Link href="/#hero" className="flex items-center gap-3" aria-label="Data Vista home">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-accent text-white text-xl font-bold shadow-lg">
                  D
                </span>
                <span className="text-2xl font-bold tracking-tight text-white drop-shadow">Data Vista</span>
              </Link>
              <div className="flex-1" />
              <nav aria-label="Primary">
                <ul className="flex items-center gap-2">
                  <li>
                    <Link
                      href={{ pathname: "/", hash: "ask" }}
                      className="text-base text-slate-200 hover:text-accent font-medium px-3 py-1 rounded-xl transition"
                    >
                      Ask
                    </Link>
                  </li>
                  <li>
                    <NavLink href="/history">History</NavLink>
                  </li>
                  <li>
                    <NavLink href="/settings/datasources" className="hidden sm:inline-flex" exact={false}>
                      Settings
                    </NavLink>
                  </li>
                </ul>
              </nav>
              <AuthNav />
            </div>
          </header>
          <div className="flex-1">
            <div className="mx-auto w-full max-w-5xl px-6 py-10">
              <main
                id="main-content"
                className="min-h-[60vh] rounded-3xl border border-[#23263a]/40 bg-[#23263a]/80 p-10 shadow-2xl backdrop-blur-xl"
              >
                {children}
              </main>
            </div>
          </div>
          <footer className="border-t border-[#23263a]/60 bg-[#23263a]/80 py-6 text-center text-xs text-slate-400 shadow-lg backdrop-blur-xl">
            <div className="flex flex-wrap items-center justify-center gap-6">
              <Link href="#" className="hover:text-accent transition">
                Privacy
              </Link>
              <Link href="#" className="hover:text-accent transition">
                Terms
              </Link>
              <span>&copy; {new Date().getFullYear()} Data Vista. Intelligent Data Insights Platform.</span>
            </div>
          </footer>
        </div>
        <AppToaster />
      </body>
    </html>
  );
}

export const metadata = {
  title: "Data Vista",
  description: "Intelligent Data Insights Platform. Ask questions, get instant analytics, and safe SQL.",
  openGraph: {
    title: "Data Vista",
    description: "Intelligent Data Insights Platform. Ask questions, get instant analytics, and safe SQL.",
    url: process.env.NEXTAUTH_URL || "http://localhost:3000",
    siteName: "Data Vista",
    images: [{ url: "/og.svg", width: 1200, height: 630, alt: "Data Vista" }],
    locale: "en_US",
    type: "website",
  },
  icons: {
    icon: "/favicon.svg",
  },
};
