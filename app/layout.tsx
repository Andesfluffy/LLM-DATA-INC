import "./globals.css";
import { ReactNode } from "react";
import Link from "next/link";
import AuthNav from "@/components/auth-nav";
import { AppToaster } from "@/src/components/ui/Toast";
import { Inter, Space_Grotesk } from "next/font/google";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const grotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-grotesk", display: "swap" });

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  // theme is applied client-side via hook in individual components if needed; layout stays server
  return (
    <html lang="en" className={`${inter.variable} ${grotesk.variable}`}>
      <body>
        <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#181c28] to-[#23263a]">
          <nav className="border-b border-[#23263a]/60 bg-[#23263a]/80 backdrop-blur-xl sticky top-0 z-10 shadow-lg">
            <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-6">
              <Link href="/#hero" className="flex items-center gap-3">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-accent text-white font-bold text-xl shadow-lg">
                  {/* Elegant logo box, replace with SVG if needed */}
                  D
                </span>
                <span className="font-bold text-2xl tracking-tight text-white drop-shadow">Data Vista</span>
              </Link>
              <div className="flex-1" />
              <Link
                href={{ pathname: "/", hash: "ask" }}
                className="text-base text-slate-200 hover:text-accent font-medium px-3 py-1 rounded-xl transition"
              >
                Ask
              </Link>
              <Link
                href="/history"
                className="text-base text-slate-200 hover:text-accent font-medium px-3 py-1 rounded-xl transition"
              >
                History
              </Link>
              <Link
                href="/settings/datasources"
                className="text-base text-slate-200 hover:text-accent font-medium px-3 py-1 rounded-xl transition"
              >
                Settings
              </Link>
              <AuthNav />
            </div>
          </nav>
          <div className="flex-1 max-w-5xl mx-auto w-full px-6 py-10">
            <main className="bg-[#23263a]/80 rounded-3xl shadow-2xl p-10 min-h-[60vh] backdrop-blur-xl border border-[#23263a]/40">
              {children}
            </main>
          </div>
          <footer className="border-t border-[#23263a]/60 bg-[#23263a]/80 text-xs text-slate-400 py-6 text-center space-x-6 shadow-lg backdrop-blur-xl">
            <Link href="#" className="hover:text-accent transition">Privacy</Link>
            <Link href="#" className="hover:text-accent transition">Terms</Link>
            <span>Â© {new Date().getFullYear()} Data Vista. Intelligent Data Insights Platform.</span>
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

