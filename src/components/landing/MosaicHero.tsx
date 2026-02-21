"use client";
import Link from "next/link";
import { Shield, Zap, BarChart3 } from "lucide-react";
import { buttonClassName } from "@/src/components/Button";
import GoogleGlyph from "@/src/components/GoogleGlyph";
import { useFirebaseAuth } from "@/src/hooks/useFirebaseAuth";
import { toast } from "@/src/components/ui/Toast";
import { useState } from "react";

export default function MosaicHero() {
  const { user, loading, signInWithGoogle } = useFirebaseAuth();
  const [authenticating, setAuthenticating] = useState(false);

  async function handleGoogle() {
    setAuthenticating(true);
    try {
      await signInWithGoogle();
      toast.success("Signed in successfully.");
      // page.tsx handles scroll-to-top on auth state change
    } catch (err) {
      console.error("Google sign-in failed", err);
      toast.error("Google sign-in failed. Please try again.");
    } finally {
      setAuthenticating(false);
    }
  }

  const signInDisabled = authenticating || loading;

  return (
    <div className="space-y-0" id="hero">
      <section className="relative overflow-hidden rounded-2xl scroll-mt-24">
        {/* Background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-black" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_900px_400px_at_50%_0%,rgba(255,255,255,0.04),transparent_70%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_600px_300px_at_30%_60%,rgba(255,255,255,0.02),transparent_60%)]" />
          <div className="absolute top-16 left-1/2 -translate-x-1/2 w-[600px] h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
          <div className="absolute top-[64px] left-1/2 -translate-x-1/2 flex gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="h-1 w-1 rounded-full bg-white/20 animate-pulse-glow"
                style={{ animationDelay: `${i * 300}ms` }}
              />
            ))}
          </div>
        </div>

        <div className="relative px-5 sm:px-8 md:px-12 lg:px-16 py-20 sm:py-28 md:py-32 lg:py-40">
          <div className="max-w-4xl mx-auto text-center">
            <div className="animate-fade-in-up inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-1.5 text-[11px] uppercase tracking-[0.2em] text-grape-300 mb-8 backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-white/60 animate-pulse" />
              Real-Time Business Intelligence
            </div>

            <h1
              className="animate-fade-in-up text-[2.5rem] sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-[-0.04em] text-white leading-[1.06]"
              style={{ animationDelay: "100ms" }}
            >
              Stop guessing.
              <br />
              <span className="gradient-text">Start knowing.</span>
            </h1>

            <p
              className="animate-fade-in-up mt-6 text-grape-400 max-w-xl mx-auto text-base sm:text-lg leading-relaxed"
              style={{ animationDelay: "200ms" }}
            >
              Connect your database and get instant business insights, forecasts,
              and answers — in plain English. No analyst, no SQL, no waiting.
            </p>

            <div
              className="animate-fade-in-up mt-10 flex flex-col sm:flex-row items-center justify-center gap-3"
              style={{ animationDelay: "300ms" }}
            >
              <button
                onClick={handleGoogle}
                disabled={signInDisabled}
                className="inline-flex h-12 w-full sm:w-auto items-center justify-center rounded-full border border-white/[0.2] bg-white px-7 text-sm font-semibold text-black transition hover:bg-white/95 disabled:cursor-not-allowed disabled:opacity-60 gap-2"
              >
                <GoogleGlyph className="h-5 w-5" />
                {authenticating ? "Connecting..." : "Sign in with Google"}
              </button>
              <Link
                href="mailto:hello@datavista.ai"
                className={buttonClassName({
                  variant: "accent",
                  className: "w-full sm:w-auto px-7 py-3",
                })}
              >
                Contact us
              </Link>
            </div>

            <div
              className="animate-fade-in-up mt-12 flex flex-wrap justify-center gap-3"
              style={{ animationDelay: "400ms" }}
            >
              {[
                { icon: Zap, text: "Real-time insights" },
                { icon: BarChart3, text: "Forecasts & projections" },
                { icon: Shield, text: "No SQL needed" },
              ].map(({ icon: Icon, text }) => (
                <span
                  key={text}
                  className="inline-flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.02] px-3.5 py-2 text-xs text-grape-400 backdrop-blur-sm"
                >
                  <Icon className="h-3.5 w-3.5 text-grape-300" />
                  {text}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
