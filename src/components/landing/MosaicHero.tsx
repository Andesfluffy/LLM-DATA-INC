"use client";
import Link from "next/link";
import Image from "next/image";
import Button, { buttonClassName } from "@/src/components/Button";

export default function MosaicHero() {
  return (
    <div
      className="rounded-2xl p-[1.5px] bg-gradient-to-tr from-accent/70 via-accent/20 to-transparent"
      id="hero"
    >
      <section className="relative overflow-hidden rounded-2xl border border-[#2A2D3A] bg-[#0B0F12] scroll-mt-24">
        {/* Background image (place your selected hero at public/hero.jpg) */}
        <div className="absolute inset-0">
          <Image
            src="/hero.jpg"
            alt="Data hero"
            fill
            priority
            className="object-cover opacity-60"
          />
          {/* Orange/black brand overlay for cohesion */}
          <div className="absolute inset-0 bg-[radial-gradient(800px_400px_at_15%_20%,rgba(249,115,22,0.22),transparent_60%)]" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0B0F12] via-[#0B0F12]/70 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F12]/40 to-transparent" />
        </div>

        {/* Content */}
        <div className="relative px-5 sm:px-8 md:px-12 py-12 sm:py-16 md:py-24 max-w-6xl mx-auto">
          <p className="text-xs sm:text-sm tracking-wide text-accent font-semibold">Data Vista</p>
          <h1 className="mt-2 text-3xl sm:text-4xl md:text-5xl font-semibold tracking-[-0.02em] text-white max-w-3xl leading-tight">
            Ask in English. See answers in seconds.
          </h1>
          <p className="mt-3 md:mt-4 text-gray-300 max-w-2xl text-sm sm:text-base">
            Data Vista converts natural language into safe, audit-ready SQL and delivers charts or tables on demand. Built for busy teams that need clarity fast without compromising on control.
          </p>
          <ul className="mt-6 space-y-2 text-sm text-gray-300 max-w-2xl">
            <li>- SELECT-only guardrails, single statement, enforced LIMIT</li>
            <li>- Schema-aware generation with a five-minute schema cache</li>
            <li>- Ten second execution timeouts with clear, helpful errors</li>
            <li>- Auto charts (line/bar), CSV export, complete audit trail</li>
          </ul>
          <div className="mt-6 sm:mt-8 flex flex-wrap items-center gap-3">
            <Link href={{ pathname: "/", hash: "ask" }} aria-label="Ask a question">
              <Button className="shadow-md">Ask Now</Button>
            </Link>
            <Link
              href="/settings/datasources"
              className={buttonClassName({ variant: "secondary" })}
            >
              Connect Database
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
