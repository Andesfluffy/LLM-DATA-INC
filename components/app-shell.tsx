"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { useFirebaseAuth, FirebaseAuthProvider } from "@/src/hooks/useFirebaseAuth";

import AuthNav from "@/components/auth-nav";
import NavLink from "@/components/nav-link";

type AppShellProps = {
  children: ReactNode;
};

export default function AppShell({ children }: AppShellProps) {
  return (
    <FirebaseAuthProvider>
      <AppShellInner>{children}</AppShellInner>
    </FirebaseAuthProvider>
  );
}

function AppShellInner({ children }: AppShellProps) {
  const { user, loading } = useFirebaseAuth();
  const isSignedIn = Boolean(user);

  if (!isSignedIn || loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <main id="main-content" className="flex-1">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-black/80 backdrop-blur-2xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="group flex items-center gap-2.5"
            aria-label="Data Vista home"
          >
            <Image
              src="/logo.png"
              alt="Data Vista"
              width={36}
              height={36}
              className="rounded-lg transition-transform group-hover:scale-105"
              priority
            />
            <span className="hidden text-[17px] font-bold tracking-tight text-white xs:inline sm:inline">
              Data Vista
            </span>
          </Link>

          <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
            <NavLink href="/" exact>
              Home
            </NavLink>
            <NavLink href="/history">History</NavLink>
            <NavLink href="/settings/glossary" exact={false}>
              Glossary
            </NavLink>
            <NavLink href="/settings/datasources" exact={false}>
              Settings
            </NavLink>
          </nav>

          <div className="flex items-center gap-3">
            <details className="group relative md:hidden">
              <summary className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-grape-300 transition hover:text-white [&::-webkit-details-marker]:hidden">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M3 12h18M3 6h18M3 18h18" />
                </svg>
              </summary>
              <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-xl border border-white/[0.08] bg-black/95 p-2 shadow-2xl backdrop-blur-xl">
                <Link
                  href="/"
                  className="block rounded-lg px-3 py-2.5 text-sm text-grape-300 transition hover:bg-white/[0.04] hover:text-white"
                >
                  Home
                </Link>
                <Link
                  href="/history"
                  className="block rounded-lg px-3 py-2.5 text-sm text-grape-300 transition hover:bg-white/[0.04] hover:text-white"
                >
                  History
                </Link>
                <Link
                  href="/settings/glossary"
                  className="block rounded-lg px-3 py-2.5 text-sm text-grape-300 transition hover:bg-white/[0.04] hover:text-white"
                >
                  Glossary
                </Link>
                <Link
                  href="/settings/datasources"
                  className="block rounded-lg px-3 py-2.5 text-sm text-grape-300 transition hover:bg-white/[0.04] hover:text-white"
                >
                  Settings
                </Link>
              </div>
            </details>

            <AuthNav />
          </div>
        </div>
      </header>

      <div className="flex-1">
        <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
          <main id="main-content" className="min-h-[60vh]">
            {children}
          </main>
        </div>
      </div>

      <footer className="relative border-t border-white/[0.06] bg-black">
        <div className="divider-gradient absolute left-0 right-0 top-0" />

        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-12 sm:gap-8">
            <div className="sm:col-span-5">
              <Link href="/" className="group mb-5 flex items-center gap-2.5">
                <Image
                  src="/logo.png"
                  alt="Data Vista"
                  width={30}
                  height={30}
                  className="rounded-md"
                />
                <span className="text-base font-bold tracking-tight text-white">
                  Data Vista
                </span>
              </Link>
              <p className="max-w-xs text-sm leading-relaxed text-grape-400">
                Ask questions in plain English and get instant, audit-ready analytics
                from your databases.
              </p>
              <div className="mt-5 flex items-center gap-3">
                <span className="flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.02] px-3 py-1.5 text-[11px] text-grape-500">
                  <span className="h-1.5 w-1.5 rounded-full bg-mint-400 animate-pulse" />
                  All systems operational
                </span>
              </div>
            </div>

            <div className="sm:col-span-3">
              <h4 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-grape-500">
                Product
              </h4>
              <ul className="space-y-2.5">
                <li>
                  <Link href="/" className="text-sm text-grape-400 transition hover:text-white">
                    Home
                  </Link>
                </li>
                <li>
                  <Link
                    href="/history"
                    className="text-sm text-grape-400 transition hover:text-white"
                  >
                    History
                  </Link>
                </li>
                <li>
                  <Link
                    href="/settings/datasources"
                    className="text-sm text-grape-400 transition hover:text-white"
                  >
                    Data Sources
                  </Link>
                </li>
                <li>
                  <Link
                    href="/settings/glossary"
                    className="text-sm text-grape-400 transition hover:text-white"
                  >
                    Glossary
                  </Link>
                </li>
              </ul>
            </div>

            <div className="sm:col-span-4">
              <h4 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-grape-500">
                Platform
              </h4>
              <ul className="space-y-2.5">
                <li>
                  <Link
                    href="/settings/datasources"
                    className="text-sm text-grape-400 transition hover:text-white"
                  >
                    Connect Database
                  </Link>
                </li>
                <li>
                  <Link
                    href="/dashboard"
                    className="text-sm text-grape-400 transition hover:text-white"
                  >
                    Dashboards
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/[0.06] pt-6 sm:flex-row">
            <p className="text-xs text-grape-500">
              &copy; {new Date().getFullYear()} Data Vista. All rights reserved.
            </p>
            <p className="text-[11px] text-grape-500/70">
              Enterprise-grade analytics powered by AI
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
